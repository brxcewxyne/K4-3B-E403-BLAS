import { generateJson, getModelName } from "../ai/client";
import { CHAT_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk, rankChunks } from "../sources/chunks";
import { AppError } from "../shared/api";
import { truncateText } from "../logging/redact";
import { logEvent } from "../logging/logger";
import { checkLabScope, outOfScopeResponse } from "./scope";
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

function stepDetails(step: NonNullable<ChatWorkflowContext["currentStep"]>) {
  const lines = [`${step.order}. ${step.title} (${step.id})`];
  if (step.goal) lines.push(`Goal: ${step.goal}`);
  if (step.requirements.length) lines.push(`Requirements: ${step.requirements.join("; ")}`);
  if (step.whatToDo.length) lines.push(`What to do: ${step.whatToDo.join("; ")}`);
  if (step.howToDoIt.length) lines.push(`How to do it: ${step.howToDoIt.join("; ")}`);
  if (step.expectedOutput.length) lines.push(`Expected output: ${step.expectedOutput.join("; ")}`);
  if (step.successCriteria.length) lines.push(`Success criteria: ${step.successCriteria.join("; ")}`);
  if (step.warnings.length) lines.push(`Warnings: ${step.warnings.join("; ")}`);
  return lines.join("\n");
}

function progressContext(progress?: LabProgress, workflow?: ChatWorkflowContext, viewingStepId?: string) {
  if (!progress || !workflow) return "No generated workflow progress is available. Answer from source chunks only.";
  const label = (step: ChatWorkflowContext["currentStep"]) => step ? `${step.order}. ${step.title} (${step.id})` : "None";
  const viewing = viewingStepId && viewingStepId !== progress.currentStepId
    ? [...workflow.completedSteps, ...(workflow.currentStep ? [{ id: workflow.currentStep.id, order: workflow.currentStep.order, title: workflow.currentStep.title }] : []), ...(workflow.nextStep ? [{ id: workflow.nextStep.id, order: workflow.nextStep.order, title: workflow.nextStep.title }] : [])].find((item) => item.id === viewingStepId)
    : undefined;
  return `Student-saved progress (reported state, not independently verified). The synthesized workflow below is the primary guide; source chunks are supporting evidence. Actual progress ALWAYS comes from currentStepId below — never treat the viewing step as progress.
Current step:
${workflow.currentStep ? stepDetails(workflow.currentStep) : "None"}
Completed: ${workflow.completedSteps.map((item) => `${item.order}. ${item.title} (${item.id})`).join("; ") || "None"}
Previous: ${label(workflow.previousStep)}
Next step:
${workflow.nextStep ? stepDetails(workflow.nextStep) : "None"}
${viewing ? `Viewing step (UI browse-only, NOT progress): ${viewing.order}. ${viewing.title} (${viewing.id})` : ""}
Lab goal: ${workflow.goal}`;
}

export async function answerGroundedQuestion(input: { question: string; sources: SourceDocument[]; workflowContext?: ChatWorkflowContext; progress?: LabProgress; sessionId?: string; history?: ChatTurn[]; selectedStepId?: string; labTitle?: string }): Promise<ChatAnswer> {
  // Lab-scope guard first: unrelated questions get a local refusal, no provider call.
  const scopeSteps = [input.workflowContext?.currentStep, input.workflowContext?.previousStep, input.workflowContext?.nextStep, ...(input.workflowContext?.completedSteps || [])];
  const scope = checkLabScope(input.question, {
    labTitle: input.labTitle || input.workflowContext?.goal,
    fileNames: input.sources.map((source) => source.name),
    headings: input.sources.flatMap((source) => source.headings),
    stepTitles: scopeSteps.filter((step): step is NonNullable<typeof step> => Boolean(step)).map((step) => step.title)
  });
  if (!scope.inScope) {
    logEvent({
      eventType: "chat_request_completed",
      sessionId: input.sessionId,
      data: {
        scope: "out-of-scope",
        scopeReason: scope.reason,
        servedLocally: true,
        question: truncateText(input.question, 2000),
        currentStepId: input.progress?.currentStepId ?? null,
        durationMs: 0
      }
    });
    return { answer: outOfScopeResponse(input.question), citations: [] };
  }
  const chunks = selectChatChunks(input.sources, input.question);
  const context = chunks.map((chunk) => `===== CHUNK sourceId=${chunk.sourceId} file=${chunk.file} section=${chunk.section} =====\n${chunk.content}`).join("\n\n");
  const prompt = `Return JSON: { "answer": "string", "citations": [{ "sourceId": "provided id", "file": "provided file", "section": "provided heading", "excerpt": "verbatim excerpt" }] }

Workflow progress context:
${progressContext(input.progress, input.workflowContext, input.selectedStepId)}

Recent conversation:
${(input.history || []).slice(-8).map((turn) => `${turn.role}: ${turn.content}`).join("\n") || "None"}

Relevant source chunks:
${context}

Student question:
${input.question}`;
  const startedAt = Date.now();
  const model = getModelName("chat");
  logEvent({
    eventType: "chat_request_started",
    sessionId: input.sessionId,
    data: {
      model,
      question: truncateText(input.question, 2000),
      currentStepId: input.progress?.currentStepId ?? null,
      selectedStepId: input.selectedStepId ?? null,
      sourceIds: input.sources.map((source) => source.id),
      historyTurns: input.history?.length ?? 0,
      chunks: chunks.length,
      characters: prompt.length
    }
  });
  let result: unknown;
  try {
    result = await generateJson("chat", CHAT_SYSTEM_PROMPT, prompt, input.sessionId);
  } catch (error) {
    logEvent({
      eventType: "chat_request_failed",
      sessionId: input.sessionId,
      data: {
        model,
        errorCode: error instanceof AppError ? error.code : "UNKNOWN",
        currentStepId: input.progress?.currentStepId ?? null,
        durationMs: Date.now() - startedAt
      }
    });
    throw error;
  }
  const parsed = chatAnswerSchema.safeParse(result);
  if (!parsed.success) {
    logEvent({
      eventType: "chat_request_failed",
      sessionId: input.sessionId,
      data: { model, errorCode: "CHAT_SCHEMA_ERROR", currentStepId: input.progress?.currentStepId ?? null, durationMs: Date.now() - startedAt }
    });
    throw new AppError("CHAT_SCHEMA_ERROR", "The AI provider returned an invalid chat response.", 502);
  }

  const citations = parsed.data.citations.map((citation) => {
    const chunk = chunks.find((item) => item.sourceId === citation.sourceId) || chunks.find((item) => item.file === citation.file);
    if (!chunk) return null;
    const normalized = chunk.content.replace(/\s+/g, " ");
    const excerpt = normalized.includes(citation.excerpt.replace(/\s+/g, " ")) ? citation.excerpt : excerptFromChunk(chunk);
    return excerpt ? { sourceId: chunk.sourceId, file: chunk.file, section: chunk.section, excerpt } : null;
  }).filter((citation): citation is NonNullable<typeof citation> => Boolean(citation));
  logEvent({
    eventType: "chat_request_completed",
    sessionId: input.sessionId,
    data: {
      model,
      question: truncateText(input.question, 2000),
      answer: truncateText(parsed.data.answer, 8000),
      citations: citations.map((citation) => ({ sourceId: citation.sourceId, file: citation.file, section: citation.section })),
      currentStepId: input.progress?.currentStepId ?? null,
      durationMs: Date.now() - startedAt
    }
  });
  return { answer: parsed.data.answer, citations };
}
