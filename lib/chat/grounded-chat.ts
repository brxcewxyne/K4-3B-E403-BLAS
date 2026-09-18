import { generateJson, getReasoningEffort } from "../ai/client";
import { CHAT_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk, rankChunks } from "../sources/chunks";
import { AppError } from "../shared/api";
import { chatAnswerSchema } from "../shared/schemas";
import type { ChatAnswer, ChatTurn, LabWorkflow, SourceDocument } from "../shared/types";

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

export async function answerGroundedQuestion(input: { question: string; sources: SourceDocument[]; workflow?: LabWorkflow; sessionId?: string; currentStep?: string; history?: ChatTurn[] }): Promise<ChatAnswer> {
  const chunks = selectChatChunks(input.sources, input.question);
  const context = chunks.map((chunk) => `===== CHUNK sourceId=${chunk.sourceId} file=${chunk.file} section=${chunk.section} =====\n${chunk.content}`).join("\n\n");
  const current = input.workflow?.steps.find((step) => step.id === input.currentStep);
  const prompt = `Return JSON: { "answer": "string", "citations": [{ "sourceId": "provided id", "file": "provided file", "section": "provided heading", "excerpt": "verbatim excerpt" }] }

Current workflow context:
Goal: ${input.workflow?.goal || "No generated workflow is available; answer directly from the source chunks."}
Current step: ${current ? `${current.order}. ${current.title} — ${current.description}` : "Not specified"}

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
