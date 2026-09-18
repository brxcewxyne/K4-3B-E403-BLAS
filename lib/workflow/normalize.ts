import type { Citation, WorkflowStep } from "../shared/types";

/**
 * Loose step shape accepted from parsed AI output. Every field is optional
 * here so normalization — not Zod output inference — is the single place
 * that guarantees a strict WorkflowStep. Nothing is asserted with `as`.
 */
export type LooseWorkflowStep = {
  id?: unknown;
  order?: unknown;
  title?: unknown;
  goal?: unknown;
  requirements?: unknown;
  whatToDo?: unknown;
  howToDoIt?: unknown;
  expectedOutput?: unknown;
  successCriteria?: unknown;
  warnings?: unknown;
  sources?: unknown;
  description?: unknown;
  requiredActions?: unknown;
  hints?: unknown;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function asCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Citation =>
    !!item &&
    typeof item === "object" &&
    ["sourceId", "file", "section", "excerpt"].every((key) => typeof (item as Record<string, unknown>)[key] === "string")
  );
}

/**
 * Map a loosely-typed parsed step onto the strict synthesis-first shape.
 * New fields win; legacy pre-synthesis fields (`description`,
 * `requiredActions`, `hints`) fill gaps so older payloads still render
 * complete instructions. Never invents content: unsupported fields stay
 * empty and the UI states that explicitly.
 */
export function normalizeWorkflowStep(step: LooseWorkflowStep, index: number): WorkflowStep {
  const whatToDo = asStrings(step.whatToDo);
  const howToDoIt = asStrings(step.howToDoIt);
  const legacyActions = asStrings(step.requiredActions);
  const legacyHints = asStrings(step.hints);
  return {
    id: asText(step.id) || `step-${index + 1}`,
    order: typeof step.order === "number" && Number.isInteger(step.order) && step.order > 0 ? step.order : index + 1,
    title: asText(step.title) || `Step ${index + 1}`,
    goal: asText(step.goal) || asText(step.description),
    requirements: asStrings(step.requirements),
    whatToDo: whatToDo.length ? whatToDo : legacyActions,
    howToDoIt: howToDoIt.length ? howToDoIt : legacyHints,
    expectedOutput: asStrings(step.expectedOutput),
    successCriteria: asStrings(step.successCriteria),
    warnings: asStrings(step.warnings),
    sources: asCitations(step.sources),
    ...(asText(step.description) ? { description: asText(step.description) } : {}),
    ...(legacyActions.length && !whatToDo.length ? { requiredActions: legacyActions } : {}),
    ...(legacyHints.length && !howToDoIt.length ? { hints: legacyHints } : {})
  };
}
