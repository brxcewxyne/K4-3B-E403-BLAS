import { createAIRequestSessionId, generateJson, getModelName, getReasoningEffort, getWorkflowFallbackModel } from "../ai/client";
import { WORKFLOW_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk } from "../sources/chunks";
import { AppError } from "../shared/api";
import { labWorkflowSchema } from "../shared/schemas";
import type { Citation, LabWorkflow, SourceDocument } from "../shared/types";
import { prepareWorkflowContext } from "./context";
import { normalizeWorkflowStep } from "./normalize";

function sanitizeCitation(citation: Citation, sources: SourceDocument[]): Citation | null {
  const source = sources.find((item) => item.id === citation.sourceId) || sources.find((item) => item.name === citation.file || item.path === citation.file);
  if (!source) return null;
  const chunks = chunkSources([source]);
  const chunk = chunks.find((item) => item.section.toLowerCase() === citation.section.toLowerCase()) || chunks[0];
  const normalizedContent = source.content.replace(/\s+/g, " ");
  const excerpt = normalizedContent.includes(citation.excerpt.replace(/\s+/g, " ")) ? citation.excerpt : excerptFromChunk(chunk);
  if (!excerpt) return null;
  return { sourceId: source.id, file: source.name, section: chunk.section, excerpt };
}

export async function extractWorkflow(sources: SourceDocument[], sessionId?: string): Promise<LabWorkflow> {
  const schema = `{
  "title": "string", "goal": "string", "prerequisites": ["string"],
  "steps": [{
    "id": "step-1", "order": 1, "title": "string",
    "goal": "why this step exists (1-2 sentences)",
    "requirements": ["prerequisite state before starting"],
    "whatToDo": ["complete concrete action the user takes"],
    "howToDoIt": ["exact command, file, path, value or click-path"],
    "expectedOutput": ["tangible deliverable this step produces"],
    "successCriteria": ["observable check that the step is done"],
    "warnings": ["pitfall or common failure to avoid"],
    "sources": [{ "sourceId": "provided id", "file": "provided filename", "section": "heading", "excerpt": "verbatim excerpt" }]
  }],
  "checkpoints": [{ "title": "string", "requirements": ["string"], "sources": [Citation] }],
  "conflicts": [{ "description": "string", "sources": [Citation] }]
}`;
  const stableSessionId = createAIRequestSessionId(sessionId);
  const primaryModel = getModelName("workflow");
  const fallbackModel = getWorkflowFallbackModel() || primaryModel;
  const attempts = [
    { mode: "normal" as const, timeoutMs: 23_000, model: primaryModel },
    { mode: "compact" as const, timeoutMs: 23_000, model: fallbackModel }
  ];
  let result: unknown;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const context = prepareWorkflowContext(sources, attempt.mode);
    const startedAt = Date.now();
    console.info("Workflow generation", {
      sources: context.inputSourceCount,
      totalCharacters: context.inputCharacters,
      selectedSources: context.sourceNames,
      chunks: context.chunks,
      characters: context.characters,
      model: attempt.model || "not-configured",
      reasoningEffort: getReasoningEffort("workflow"),
      attempt: index + 1,
      timeoutMs: attempt.timeoutMs
    });
    try {
      result = await generateJson(
        "workflow",
        WORKFLOW_SYSTEM_PROMPT,
        `Schema:\n${schema}\n\nRelevant source chunks:\n${context.payload}`,
        stableSessionId,
        { timeoutMs: attempt.timeoutMs, requestLabel: `workflow-attempt-${index + 1}`, model: attempt.model }
      );
      console.info("Workflow generation result", { model: attempt.model, reasoningEffort: getReasoningEffort("workflow"), characters: context.characters, attempt: index + 1, durationMs: Date.now() - startedAt, result: "success" });
      break;
    } catch (error) {
      const retryable = error instanceof AppError && (error.code === "AI_TIMEOUT" || error.code === "AI_PROVIDER_UNAVAILABLE");
      console.warn("Workflow generation result", { model: attempt.model, reasoningEffort: getReasoningEffort("workflow"), characters: context.characters, attempt: index + 1, durationMs: Date.now() - startedAt, result: error instanceof AppError ? error.code : "UNKNOWN", retrying: retryable && index === 0 });
      if (retryable && index === 0) continue;
      if (error instanceof AppError && error.code === "AI_TIMEOUT") {
        throw new AppError("AI_TIMEOUT", "Workflow generation took too long. Try again with fewer source files.", 504);
      }
      throw error;
    }
  }

  const parsed = labWorkflowSchema.safeParse(result);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    throw new AppError("WORKFLOW_SCHEMA_ERROR", "The AI provider returned a workflow that did not match the required schema.", 502);
  }
  const sanitize = (citations: Citation[]) => citations.map((citation) => sanitizeCitation(citation, sources)).filter((citation): citation is Citation => Boolean(citation));
  return {
    ...parsed.data,
    steps: [...parsed.data.steps].sort((a, b) => a.order - b.order).map((step, index) => ({ ...normalizeWorkflowStep(step, index), order: index + 1, sources: sanitize(step.sources) })),
    checkpoints: parsed.data.checkpoints.map((checkpoint) => ({ ...checkpoint, sources: sanitize(checkpoint.sources) })),
    conflicts: parsed.data.conflicts.map((conflict) => ({ ...conflict, sources: sanitize(conflict.sources) }))
  };
}
