export type SourceType = "markdown" | "mdx";

export type SourceDocument = {
  id: string;
  name: string;
  path: string;
  content: string;
  type: SourceType;
  repository?: string;
  headings: string[];
};

export type Citation = {
  sourceId: string;
  file: string;
  section: string;
  excerpt: string;
};

export type WorkflowStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  requiredActions: string[];
  successCriteria: string[];
  hints: string[];
  sources: Citation[];
};

export type LabWorkflow = {
  title: string;
  goal: string;
  prerequisites: string[];
  steps: WorkflowStep[];
  checkpoints: Array<{
    title: string;
    requirements: string[];
    sources: Citation[];
  }>;
  conflicts: Array<{
    description: string;
    sources: Citation[];
  }>;
};

export type LabProgress = {
  currentStepId: string | null;
  completedStepIds: string[];
  stepHistory: string[];
};

export type ChatWorkflowStep = Pick<WorkflowStep, "id" | "order" | "title" | "description" | "requiredActions" | "successCriteria">;

export type ChatWorkflowContext = {
  goal: string;
  currentStep?: ChatWorkflowStep;
  previousStep?: ChatWorkflowStep;
  nextStep?: ChatWorkflowStep;
  completedSteps: Array<Pick<WorkflowStep, "id" | "order" | "title">>;
};

export type ChatAnswer = {
  answer: string;
  citations: Citation[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
