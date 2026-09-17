export type SourceStatus = "Ready" | "Processing" | "Indexed" | "Failed";

export type LabSource = {
  id: string;
  name: string;
  path: string;
  kind: "Markdown" | "Repository" | "Archive" | "Guide";
  status: SourceStatus;
  section: string;
  preview: string;
  content?: string;
};

export type Citation = {
  filename: string;
  section: string;
  quote?: string;
  line?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  grounded?: boolean;
};

export type WorkflowStep = {
  id: number;
  title: string;
  description: string;
  actions: string[];
  criteria: string[];
  sources: string[];
  expectedResult?: string;
};

export type StructuredGuide = {
  title: string;
  overview: string;
  objectives: string[];
  steps: Array<{
    order: number;
    title: string;
    purpose?: string;
    instructions: string[];
    commands: Array<{ command: string; description?: string }>;
    expectedResult?: string;
    sources: string[];
  }>;
  completionRequirements: Array<{ content: string; sources: string[] }>;
  sources: string[];
};

export type GuideResponse = {
  id: string;
  title: string;
  repositoryUrl?: string | null;
  branch?: string | null;
  subfolder?: string | null;
  markdownContent: string;
  structuredContent: StructuredGuide;
  status: string;
  sources: Array<{ path: string; createdAt: string }>;
};

