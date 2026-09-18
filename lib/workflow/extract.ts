import { createAIRequestSessionId, generateJson, getModelName, getReasoningEffort, getWorkflowTimeoutMs } from "../ai/client";
import { WORKFLOW_SYSTEM_PROMPT } from "../ai/prompts";
import { chunkSources, excerptFromChunk } from "../sources/chunks";
import { AppError } from "../shared/api";
import { hashString, logEvent } from "../logging/logger";
import { labWorkflowSchema } from "../shared/schemas";
import type { Citation, LabWorkflow, SourceDocument } from "../shared/types";
import { prepareWorkflowContext } from "./context";
import { mapWorkflowErrorCode } from "./error-codes";
import { buildLocalFallbackWorkflow } from "./fallback";
import { normalizeWorkflowStep } from "./normalize";

export type WorkflowGenerationResult = {
  workflow: LabWorkflow;
  generationMode: "ai" | "fallback";
  fallbackReason?: "timeout" | "provider_error";
};

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

export async function extractWorkflow(sources: SourceDocument[], sessionId?: string): Promise<WorkflowGenerationResult> {
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
  // Single AI attempt per invocation: one provider call (max 40s), then local
  // parse + validation. On timeout/transient failure a deterministic local
  // fallback builds a grounded workflow from the ingested Markdown instead.
  const timeoutMs = getWorkflowTimeoutMs();
  const repositoryTitle = sources.map((source) => source.repository).find((repository): repository is string => !!repository)?.replace("https://github.com/", "").trim() || "";
  const sourceTitle = (sources[0]?.name || "").replace(/\.(md|mdx)$/i, "").trim();
  const generationStartedAt = Date.now();
  const sourceIds = sources.map((source) => source.id);
  const inputCharacters = sources.reduce((sum, source) => sum + source.content.length, 0);
  logEvent({
    eventType: "workflow_generation_started",
    sessionId: stableSessionId,
    data: {
      model: primaryModel || "not-configured",
      reasoningEffort: getReasoningEffort("workflow"),
      timeoutMs,
      sourceCount: sources.length,
      sourceIds,
      characters: inputCharacters,
      currentStepId: null
    }
  });

  const failGeneration = (error: unknown, errorCode: string): never => {
    logEvent({
      eventType: "workflow_generation_failed",
      sessionId: stableSessionId,
      data: {
        model: primaryModel || "not-configured",
        errorCode,
        durationMs: Date.now() - generationStartedAt,
        sourceCount: sources.length,
        characters: inputCharacters,
        attempt: 1
      }
    });
    if (error instanceof AppError && (error.code === "AI_TIMEOUT" || error.code === "AI_APPLICATION_TIMEOUT")) {
      // Reached only when the local fallback also produced nothing: all
      // sources remain available, so never blame the source set.
      if (error.code === "AI_APPLICATION_TIMEOUT") {
        throw new AppError("AI_APPLICATION_TIMEOUT", "Workflow generation could not complete. Sources and Chat are still available.", 504);
      }
      throw new AppError("AI_TIMEOUT", "Workflow generation could not complete. Sources and Chat are still available.", 504);
    }
    if (errorCode === "WORKFLOW_PARSE_ERROR") {
      throw new AppError("WORKFLOW_PARSE_ERROR", "The AI provider returned a response that could not be read as a workflow.", 502);
    }
    // Auth, rate-limit, provider and request errors surface truthfully — never disguised as schema errors.
    if (error instanceof AppError) throw error;
    throw new AppError("WORKFLOW_SCHEMA_ERROR", "The AI provider returned a workflow that did not match the required schema.", 502);
  };

  const context = prepareWorkflowContext(sources, "normal");
  const contextSummary = {
    sourceNames: context.sourceNames,
    selectedSourceIds: context.selectedSourceIds,
    setupEvidence: context.setupEvidence
  };
  const promptCharacters = schema.length + context.characters + 64;
  logEvent({
    eventType: "workflow_context_ready",
    sessionId: stableSessionId,
    data: {
      sourceCount: sources.length,
      chunkCount: context.chunks,
      rawCharacters: inputCharacters,
      selectedCharacters: context.characters,
      promptCharacters,
      approximateTokens: Math.round(promptCharacters / 4),
      sourcesAvailable: sources.length,
      sourcesRepresentedInContext: contextSummary.selectedSourceIds.length,
      durationMs: Date.now() - generationStartedAt
    }
  });
  let result: unknown;
  const providerStartedAt = Date.now();
  logEvent({
    eventType: "workflow_provider_started",
    sessionId: stableSessionId,
    data: {
      model: primaryModel || "not-configured",
      reasoningEffort: getReasoningEffort("workflow"),
      timeoutMs,
      durationMs: providerStartedAt - generationStartedAt
    }
  });
  try {
    result = await generateJson(
      "workflow",
      WORKFLOW_SYSTEM_PROMPT,
      `Schema:\n${schema}\n\nRelevant source chunks:\n${context.payload}`,
      stableSessionId,
      { timeoutMs, requestLabel: "workflow", model: primaryModel }
    );
  } catch (error) {
    const errorCode = mapWorkflowErrorCode(error);
    // AI-first with deterministic grounded fallback: on timeout or transient
    // provider failure, build the workflow locally from ingested Markdown and
    // still return HTTP 200. Only a total failure (AI + fallback) errors out.
    if (errorCode === "AI_TIMEOUT" || errorCode === "AI_APPLICATION_TIMEOUT" || errorCode === "AI_PROVIDER_UNAVAILABLE") {
      const fallbackReason = errorCode === "AI_PROVIDER_UNAVAILABLE" ? "provider_error" : "timeout";
      const fallbackStartedAt = Date.now();
      logEvent({
        eventType: "workflow_fallback_started",
        sessionId: stableSessionId,
        data: { reason: fallbackReason, sourceCount: sources.length }
      });
      const fallbackWorkflow = buildLocalFallbackWorkflow(sources, repositoryTitle || sourceTitle || undefined);
      if (fallbackWorkflow.steps.length) {
        const fallbackDurationMs = Date.now() - fallbackStartedAt;
        logEvent({
          eventType: "workflow_fallback_completed",
          sessionId: stableSessionId,
          data: {
            generationMode: "fallback",
            fallbackReason,
            fallbackDurationMs,
            stepCount: fallbackWorkflow.steps.length
          }
        });
        logEvent({
          eventType: "workflow_generation_completed",
          sessionId: stableSessionId,
          data: {
            generationMode: "fallback",
            fallbackReason,
            title: fallbackWorkflow.title,
            stepCount: fallbackWorkflow.steps.length,
            sourcesAvailable: sources.length,
            durationMs: Date.now() - generationStartedAt
          }
        });
        logEvent({
          eventType: "workflow_response_returned",
          sessionId: stableSessionId,
          data: { generationMode: "fallback", stepCount: fallbackWorkflow.steps.length, durationMs: Date.now() - generationStartedAt }
        });
        return { workflow: fallbackWorkflow, generationMode: "fallback", fallbackReason };
      }
    }
    return failGeneration(error, errorCode);
  }
  logEvent({
    eventType: "workflow_provider_finished",
    sessionId: stableSessionId,
    data: {
      model: primaryModel || "not-configured",
      durationMs: Date.now() - providerStartedAt
    }
  });
  logEvent({
    eventType: "workflow_json_parsed",
    sessionId: stableSessionId,
    data: { localExtraction: true, durationMs: Date.now() - generationStartedAt }
  });

  const parsed = labWorkflowSchema.safeParse(result);
  if (!parsed.success) return failGeneration(parsed.error, "WORKFLOW_SCHEMA_ERROR");
  const sanitize = (citations: Citation[]) => citations.map((citation) => sanitizeCitation(citation, sources)).filter((citation): citation is Citation => Boolean(citation));
  // Defensive title: parsed output first, then repository/source-derived names, generic last. Never invents a lab title.
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
    eventType: "workflow_schema_validated",
    sessionId: stableSessionId,
    data: {
      stepCount: workflow.steps.length,
      checkpointCount: workflow.checkpoints.length,
      conflictCount: workflow.conflicts.length,
      durationMs: Date.now() - generationStartedAt
    }
  });
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
      model: primaryModel || "not-configured",
      attempt: 1,
      generationMode: "ai",
      sourcesAvailable: sources.length,
      sourcesRepresentedInContext: contextSummary.selectedSourceIds.length,
      setupEvidenceSources: contextSummary.setupEvidence,
      durationMs: Date.now() - generationStartedAt
    }
  });
  logEvent({
    eventType: "workflow_response_returned",
    sessionId: stableSessionId,
    data: { generationMode: "ai", stepCount: workflow.steps.length, durationMs: Date.now() - generationStartedAt }
  });
  return { workflow, generationMode: "ai" };
}
