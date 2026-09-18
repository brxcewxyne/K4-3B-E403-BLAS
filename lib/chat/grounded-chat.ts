import { generateJson, getReasoningEffort } from "../ai/client";
import { CHAT_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk, rankChunks } from "../sources/chunks";
import { AppError } from "../shared/api";
import { chatAnswerSchema } from "../shared/schemas";
import type { ChatAnswer, ChatTurn, ChatWorkflowContext, LabProgress, SourceDocument } from "../shared/types";

const CHAT_CHUNK_LIMIT = 5;
const CHAT_CONTEXT_CHAR_BUDGET = 18_000;

function selectChatChunks(sources: SourceDocument[], question: string) {
  const ranked = rankChunks(chunkSources(sources), question, CHAT_CHUNK_LIMIT);
  let used = 0;
  return ranked.flatMap((chunk) => {
    const remaining = CHAT_CONTEXT_CHAR_BUDGET - used;
    if (remaining < 200) return [];
    const content = chunk.content.slice(0, remaining);
    used += content.length;
    return [{ ...chunk, content }];
  });
}

function progressContext(progress?: LabProgress, workflow?: ChatWorkflowContext) {
  if (!progress || !workflow) return "No generated workflow progress is available. Answer from source chunks only.";
  const label = (step: ChatWorkflowContext["currentStep"]) => step ? `${step.order}. ${step.title} (${step.id})` : "None";
  return `Student-saved progress (reported state, not independently verified):
Current: ${label(workflow.currentStep)}
Current details: ${workflow.currentStep ? `${workflow.currentStep.description}\nRequired actions: ${workflow.currentStep.requiredActions.join("; ")}\nSuccess criteria: ${workflow.currentStep.successCriteria.join("; ")}` : "None"}
Completed: ${workflow.completedSteps.map((item) => `${item.order}. ${item.title} (${item.id})`).join("; ") || "None"}
Previous: ${label(workflow.previousStep)}
Next: ${label(workflow.nextStep)}
Goal: ${workflow.goal}`;
}

export async function answerGroundedQuestion(input: { question: string; sources: SourceDocument[]; workflowContext?: ChatWorkflowContext; progress?: LabProgress; sessionId?: string; history?: ChatTurn[] }): Promise<ChatAnswer> {
  const chunks = selectChatChunks(input.sources, input.question);
  const context = chunks.map((chunk) => `===== CHUNK sourceId=${chunk.sourceId} file=${chunk.file} section=${chunk.section} =====\n${chunk.content}`).join("\n\n");
  const prompt = `Return JSON: { "answer": "string", "citations": [{ "sourceId": "provided id", "file": "provided file", "section": "provided heading", "excerpt": "verbatim excerpt" }] }

Workflow progress context:
${progressContext(input.progress, input.workflowContext)}

Recent conversation:
${(input.history || []).slice(-8).map((turn) => `${turn.role}: ${turn.content}`).join("\n") || "None"}

Relevant source chunks:
${context}

Student question:
${input.question}`;
  const startedAt = Date.now();
  console.info("Chat generation", { reasoningEffort: getReasoningEffort("chat"), chunks: chunks.length, characters: prompt.length });
  let result: unknown;
  try {
    result = await generateJson("chat", CHAT_SYSTEM_PROMPT, prompt, input.sessionId);
  } finally {
    console.info("Chat generation finished", { reasoningEffort: getReasoningEffort("chat"), chunks: chunks.length, characters: prompt.length, durationMs: Date.now() - startedAt });
  }
  const parsed = chatAnswerSchema.safeParse(result);
  if (!parsed.success) throw new AppError("CHAT_SCHEMA_ERROR", "The AI provider returned an invalid chat response.", 502);

  const citations = parsed.data.citations.map((citation) => {
    const chunk = chunks.find((item) => item.sourceId === citation.sourceId) || chunks.find((item) => item.file === citation.file);
    if (!chunk) return null;
    const normalized = chunk.content.replace(/\s+/g, " ");
    const excerpt = normalized.includes(citation.excerpt.replace(/\s+/g, " ")) ? citation.excerpt : excerptFromChunk(chunk);
    return excerpt ? { sourceId: chunk.sourceId, file: chunk.file, section: chunk.section, excerpt } : null;
  }).filter((citation): citation is NonNullable<typeof citation> => Boolean(citation));
  return { answer: parsed.data.answer, citations };
}
