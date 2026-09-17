import { generateJson } from "../ai/client";
import { CHAT_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk, rankChunks } from "../sources/chunks";
import { AppError } from "../shared/api";
import { chatAnswerSchema } from "../shared/schemas";
import type { ChatAnswer, ChatTurn, LabWorkflow, SourceDocument } from "../shared/types";

export async function answerGroundedQuestion(input: { question: string; sources: SourceDocument[]; workflow: LabWorkflow; currentStep?: string; history?: ChatTurn[] }): Promise<ChatAnswer> {
  const chunks = rankChunks(chunkSources(input.sources), input.question, 7);
  const context = chunks.map((chunk) => `===== CHUNK sourceId=${chunk.sourceId} file=${chunk.file} section=${chunk.section} =====\n${chunk.content}`).join("\n\n");
  const current = input.workflow.steps.find((step) => step.id === input.currentStep);
  const prompt = `Return JSON: { "answer": "string", "citations": [{ "sourceId": "provided id", "file": "provided file", "section": "provided heading", "excerpt": "verbatim excerpt" }] }

Current workflow context:
Goal: ${input.workflow.goal}
Current step: ${current ? `${current.order}. ${current.title} — ${current.description}` : "Not specified"}

Recent conversation:
${(input.history || []).slice(-8).map((turn) => `${turn.role}: ${turn.content}`).join("\n") || "None"}

Relevant source chunks:
${context}

Student question:
${input.question}`;
  const result = await generateJson("chat", CHAT_SYSTEM_PROMPT, prompt);
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
