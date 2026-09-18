import type { WorkflowStep } from "../shared/types";

export type StepRowState = "CURRENT" | "VIEWING" | "COMPLETED" | "STEP";

/** Single source of truth for list-row labels: CURRENT wins, never combined with VIEWING. */
export function rowLabel(state: { isCurrent: boolean; isSelected: boolean; isDone: boolean; order: number }): StepRowState {
  if (state.isCurrent) return "CURRENT";
  if (state.isSelected) return "VIEWING";
  if (state.isDone) return "COMPLETED";
  return "STEP";
}

export function rowLabelText(state: { isCurrent: boolean; isSelected: boolean; isDone: boolean; order: number }): string {
  const label = rowLabel(state);
  if (label === "STEP") return `Step ${state.order}`;
  return label.charAt(0) + label.slice(1).toLowerCase();
}

/** Detail header kind: CURRENT STEP only when viewing actual progress. */
export function detailHeaderKind(isCurrentStep: boolean, order: number): string {
  return isCurrentStep ? "Current step" : `Viewing step ${order}`;
}

/** Mark Complete is only available on the actual current step. */
export function canMarkComplete(isCurrentStep: boolean, currentDone: boolean, hasCurrent: boolean): boolean {
  return hasCurrent && isCurrentStep && !currentDone;
}

export type StepSectionKey =
  | "goal"
  | "requirements"
  | "whatToDo"
  | "howToDoIt"
  | "expectedOutput"
  | "successCriteria"
  | "warnings"
  | "sources";

/** Sections with content after normalization — empty sections are hidden, never rendered with placeholder dashes. */
export function visibleStepSections(step: Pick<WorkflowStep, "goal" | "requirements" | "whatToDo" | "howToDoIt" | "expectedOutput" | "successCriteria" | "warnings" | "sources">): StepSectionKey[] {
  const sections: StepSectionKey[] = [];
  if (step.goal.trim()) sections.push("goal");
  if (step.requirements.length) sections.push("requirements");
  if (step.whatToDo.length) sections.push("whatToDo");
  if (step.howToDoIt.length) sections.push("howToDoIt");
  if (step.expectedOutput.length) sections.push("expectedOutput");
  if (step.successCriteria.length) sections.push("successCriteria");
  if (step.warnings.length) sections.push("warnings");
  if (step.sources.length) sections.push("sources");
  return sections;
}
