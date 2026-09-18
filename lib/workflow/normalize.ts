import type { WorkflowStep } from "../shared/types";

function clean(items: string[] | undefined): string[] {
  return (items ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
}

/**
 * Map a parsed step onto the synthesis-first shape. New fields win; legacy
 * pre-synthesis fields (`description`, `requiredActions`, `hints`) fill gaps
 * so older payloads still render complete instructions. Never invents content:
 * unsupported fields stay empty and the UI states that explicitly.
 */
export function normalizeWorkflowStep(step: WorkflowStep, index: number): WorkflowStep {
  const whatToDo = clean(step.whatToDo);
  const howToDoIt = clean(step.howToDoIt);
  return {
    ...step,
    id: step.id || `step-${index + 1}`,
    goal: step.goal?.trim() || step.description?.trim() || "",
    requirements: clean(step.requirements),
    whatToDo: whatToDo.length ? whatToDo : clean(step.requiredActions),
    howToDoIt: howToDoIt.length ? howToDoIt : clean(step.hints),
    expectedOutput: clean(step.expectedOutput),
    successCriteria: clean(step.successCriteria),
    warnings: clean(step.warnings)
  };
}
