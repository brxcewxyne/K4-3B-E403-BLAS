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
  /** Why this step exists — synthesized from across the ingested documents. */
  goal: string;
  /** Merged prerequisites for this step (deduplicated across files). */
  requirements: string[];
  /** Complete actions: the user follows these without reopening source files. */
  whatToDo: string[];
  /** Concrete execution detail: exact commands, files, values. */
  howToDoIt: string[];
  /** Tangible deliverables this step produces. */
  expectedOutput: string[];
  successCriteria: string[];
  /** Pitfalls, gotchas and things that commonly fail. */
  warnings: string[];
  sources: Citation[];
  /** Legacy pre-synthesis fields — still accepted and mapped forward. */
  description?: string;
  requiredActions?: string[];
  hints?: string[];
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

export type ChatWorkflowStep = Pick<WorkflowStep, "id" | "order" | "title" | "goal" | "requirements" | "whatToDo" | "howToDoIt" | "expectedOutput" | "successCriteria" | "warnings">;

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
