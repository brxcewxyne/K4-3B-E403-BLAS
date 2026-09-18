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

/** Comparison key: lowercase, punctuation-insensitive, whitespace-collapsed. */
export function dedupeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Remove intra-list duplicates, keeping the first occurrence. Exported for tests. */
export function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = dedupeKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withoutOverlap(items: string[], reference: string[]): string[] {
  const referenceKeys = new Set(reference.map(dedupeKey));
  return items.filter((item) => !referenceKeys.has(dedupeKey(item)));
}

/**
 * Map a loosely-typed parsed step onto the strict synthesis-first shape.
 * New fields win; legacy pre-synthesis fields (`description`,
 * `requiredActions`, `hints`) fill gaps so older payloads still render
 * complete instructions. Then cross-field duplicates are removed so each
 * field keeps a distinct meaning (title≠goal, whatToDo≠howToDoIt,
 * expectedOutput≠successCriteria). Never invents content: unsupported
 * fields stay empty and the UI hides them.
 */
export function normalizeWorkflowStep(step: LooseWorkflowStep, index: number): WorkflowStep {
  const title = asText(step.title) || `Step ${index + 1}`;
  const whatToDo = uniqueStrings(asStrings(step.whatToDo).length ? asStrings(step.whatToDo) : asStrings(step.requiredActions));
  const howToDoIt = withoutOverlap(uniqueStrings(asStrings(step.howToDoIt).length ? asStrings(step.howToDoIt) : asStrings(step.hints)), whatToDo);
  const expectedOutput = uniqueStrings(asStrings(step.expectedOutput));
  const successCriteria = withoutOverlap(uniqueStrings(asStrings(step.successCriteria)), expectedOutput);
  const goal = asText(step.goal) || asText(step.description);
  return {
    id: asText(step.id) || `step-${index + 1}`,
    order: typeof step.order === "number" && Number.isInteger(step.order) && step.order > 0 ? step.order : index + 1,
    title,
    goal: goal && dedupeKey(goal) !== dedupeKey(title) ? goal : "",
    requirements: uniqueStrings(asStrings(step.requirements)),
    whatToDo,
    howToDoIt,
    expectedOutput,
    successCriteria,
    warnings: uniqueStrings(asStrings(step.warnings)),
    sources: asCitations(step.sources),
    ...(asText(step.description) ? { description: asText(step.description) } : {}),
    ...(whatToDo.length && !asStrings(step.whatToDo).length && asStrings(step.requiredActions).length ? { requiredActions: asStrings(step.requiredActions) } : {}),
    ...(howToDoIt.length && !asStrings(step.howToDoIt).length && asStrings(step.hints).length ? { hints: asStrings(step.hints) } : {})
  };
}
