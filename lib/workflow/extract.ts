import { createAIRequestSessionId, generateJson, getModelName, getReasoningEffort, getWorkflowFallbackModel } from "../ai/client";
import { WORKFLOW_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk } from "../sources/chunks";
import { AppError } from "../shared/api";
import { hashString, logEvent } from "../logging/logger";
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
  const generationStartedAt = Date.now();
  const sourceIds = sources.map((source) => source.id);
  const inputCharacters = sources.reduce((sum, source) => sum + source.content.length, 0);
  logEvent({
    eventType: "workflow_generation_started",
    sessionId: stableSessionId,
    data: {
      model: primaryModel || "not-configured",
      reasoningEffort: getReasoningEffort("workflow"),
      sourceCount: sources.length,
      sourceIds,
      characters: inputCharacters,
      currentStepId: null
    }
  });
  let result: unknown;
  let usedModel = primaryModel;
  let attemptsMade = 0;

  const failGeneration = (errorCode: string): never => {
    logEvent({
      eventType: "workflow_generation_failed",
      sessionId: stableSessionId,
      data: {
        model: usedModel || "not-configured",
        errorCode,
        durationMs: Date.now() - generationStartedAt,
        sourceCount: sources.length,
        characters: inputCharacters,
        attemptsMade
      }
    });
    if (errorCode === "AI_TIMEOUT") {
      throw new AppError("AI_TIMEOUT", "Workflow generation took too long. Try again with fewer source files.", 504);
    }
    throw new AppError("WORKFLOW_SCHEMA_ERROR", "The AI provider returned a workflow that did not match the required schema.", 502);
  };

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    usedModel = attempt.model;
    attemptsMade = index + 1;
    const context = prepareWorkflowContext(sources, attempt.mode);
    try {
      result = await generateJson(
        "workflow",
        WORKFLOW_SYSTEM_PROMPT,
        `Schema:\n${schema}\n\nRelevant source chunks:\n${context.payload}`,
        stableSessionId,
        { timeoutMs: attempt.timeoutMs, requestLabel: `workflow-attempt-${index + 1}`, model: attempt.model }
      );
      break;
    } catch (error) {
      const retryable = error instanceof AppError && (error.code === "AI_TIMEOUT" || error.code === "AI_PROVIDER_UNAVAILABLE");
      if (retryable && index === 0) continue;
      if (error instanceof AppError && error.code === "AI_TIMEOUT") failGeneration("AI_TIMEOUT");
      throw error;
    }
  }

  const parsed = labWorkflowSchema.safeParse(result);
  if (!parsed.success) failGeneration("WORKFLOW_SCHEMA_ERROR");
  const sanitize = (citations: Citation[]) => citations.map((citation) => sanitizeCitation(citation, sources)).filter((citation): citation is Citation => Boolean(citation));
  // Defensive title: parsed output first, then repository/source-derived names, generic last. Never invents a lab title.
  const repositoryTitle = sources.map((source) => source.repository).find((repository): repository is string => !!repository)?.replace("https://github.com/", "").trim() || "";
  const sourceTitle = (sources[0]?.name || "").replace(/\.(md|mdx)$/i, "").trim();
  const title = parsed.data.title?.trim() || repositoryTitle || sourceTitle || "Lab Workflow";
  const workflow: LabWorkflow = {
    title,
    goal: parsed.data.goal ?? "",
    prerequisites: parsed.data.prerequisites ?? [],
    steps: [...(parsed.data.steps ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((step, index) => {
      const normalized = normalizeWorkflowStep(step, index);
      return { ...normalized, order: index + 1, sources: sanitize(normalized.sources) };
    }),
    checkpoints: (parsed.data.checkpoints ?? []).map((checkpoint) => ({
      title: checkpoint.title ?? "Checkpoint",
      requirements: checkpoint.requirements ?? [],
      sources: sanitize(checkpoint.sources ?? [])
    })),
    conflicts: (parsed.data.conflicts ?? []).map((conflict) => ({
      description: conflict.description ?? "",
      sources: sanitize(conflict.sources ?? [])
    }))
  };
  logEvent({
    eventType: "workflow_generation_completed",
    sessionId: stableSessionId,
    data: {
      workflowId: `wf-${hashString(`${workflow.title}:${workflow.steps.map((step) => step.id).join(",")}`)}`,
      title: workflow.title,
      goal: workflow.goal,
      stepCount: workflow.steps.length,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        order: step.order,
        title: step.title,
        goal: step.goal,
        requirements: step.requirements,
        whatToDo: step.whatToDo,
        howToDoIt: step.howToDoIt,
        expectedOutput: step.expectedOutput,
        successCriteria: step.successCriteria,
        warnings: step.warnings,
        sources: step.sources.map((citation) => ({ sourceId: citation.sourceId, file: citation.file, section: citation.section }))
      })),
      checkpointCount: workflow.checkpoints.length,
      conflictCount: workflow.conflicts.length,
      model: usedModel || "not-configured",
      attemptsMade,
      durationMs: Date.now() - generationStartedAt
    }
  });
  return workflow;
}
