import type { ChatWorkflowContext, LabProgress, LabWorkflow, SourceDocument } from "../shared/types";

const STORAGE_PREFIX = "ai20k-lab-progress:v2";
const HISTORY_LIMIT = 100;

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function progressStorageKey(sources: SourceDocument[], repository?: string) {
  const identity = repository
    ? `repo:${repository.trim().replace(/\/$/, "").toLowerCase()}`
    : `files:${sources.map((source) => `${source.path}:${hash(source.content)}`).sort().join("|")}`;
  return `${STORAGE_PREFIX}:${hash(identity)}`;
}

export function initialProgress(workflow: LabWorkflow): LabProgress {
  const firstId = workflow.steps[0]?.id || null;
  return { currentStepId: firstId, completedStepIds: [], stepHistory: firstId ? [firstId] : [] };
}

export function normalizeProgress(workflow: LabWorkflow, value?: Partial<LabProgress> | null): LabProgress {
  const ids = new Set(workflow.steps.map((step) => step.id));
  const completedStepIds = [...new Set(value?.completedStepIds || [])].filter((id) => ids.has(id));
  const requestedCurrent = value?.currentStepId && ids.has(value.currentStepId) ? value.currentStepId : null;
  const currentStepId = requestedCurrent || workflow.steps.find((step) => !completedStepIds.includes(step.id))?.id || workflow.steps[0]?.id || null;
  const stepHistory = (value?.stepHistory || []).filter((id) => ids.has(id)).slice(-HISTORY_LIMIT);
  if (currentStepId && stepHistory.at(-1) !== currentStepId) stepHistory.push(currentStepId);
  return { currentStepId, completedStepIds, stepHistory };
}

export function moveToStep(progress: LabProgress, stepId: string): LabProgress {
  if (progress.currentStepId === stepId) return progress;
  return { ...progress, currentStepId: stepId, stepHistory: [...progress.stepHistory, stepId].slice(-HISTORY_LIMIT) };
}

export function completeAndAdvance(workflow: LabWorkflow, progress: LabProgress): LabProgress {
  const index = workflow.steps.findIndex((step) => step.id === progress.currentStepId);
  if (index < 0) return progress;
  const completedStepIds = progress.completedStepIds.includes(workflow.steps[index].id)
    ? progress.completedStepIds
    : [...progress.completedStepIds, workflow.steps[index].id];
  const currentStepId = workflow.steps[index + 1]?.id || workflow.steps[index].id;
  return {
    currentStepId,
    completedStepIds,
    stepHistory: currentStepId === progress.currentStepId ? progress.stepHistory : [...progress.stepHistory, currentStepId].slice(-HISTORY_LIMIT)
  };
}

export function createChatWorkflowContext(workflow: LabWorkflow, progress: LabProgress): ChatWorkflowContext {
  const index = workflow.steps.findIndex((step) => step.id === progress.currentStepId);
  const compact = (step: LabWorkflow["steps"][number] | undefined) => step ? {
    id: step.id,
    order: step.order,
    title: step.title,
    goal: step.goal || step.description || "",
    requirements: step.requirements ?? [],
    whatToDo: step.whatToDo.length ? step.whatToDo : (step.requiredActions ?? []),
    howToDoIt: step.howToDoIt.length ? step.howToDoIt : (step.hints ?? []),
    expectedOutput: step.expectedOutput ?? [],
    successCriteria: step.successCriteria,
    warnings: step.warnings ?? []
  } : undefined;
  return {
    goal: workflow.goal,
    currentStep: compact(workflow.steps[index]),
    previousStep: compact(workflow.steps[index - 1]),
    nextStep: compact(workflow.steps[index + 1]),
    completedSteps: workflow.steps.filter((step) => progress.completedStepIds.includes(step.id)).map(({ id, order, title }) => ({ id, order, title }))
  };
}
