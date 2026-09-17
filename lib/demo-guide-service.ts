import type { ChatMessage, GuideResponse, LabSource } from "./client-types";

const sourceSeed: Array<Pick<LabSource, "id" | "name" | "section" | "preview" | "content">> = [
  { id: "demo-readme", name: "README.md", section: "Lab overview", preview: "Build and validate an IT Helpdesk Agent that classifies requests, retrieves support knowledge, and recommends the next action.", content: "# IT Helpdesk Agent Lab\n\nBuild and validate the baseline agent before improving its behavior. Start the application, send a test request, and inspect the generated trace." },
  { id: "demo-setup", name: "setup.md", section: "Environment setup", preview: "Create an environment file, configure the required API key, install dependencies, then start the development server.", content: "# Environment setup\n\nCopy `.env.example` to `.env`, configure the required API key, run `npm install`, then start the project with `npm run dev`." },
  { id: "demo-architecture", name: "architecture.md", section: "Agent architecture", preview: "The baseline agent uses a router, support knowledge tool, and structured response formatter.", content: "# Agent architecture\n\nRequests pass through the router before the support knowledge tool is called. Inspect the trace to verify routing and tool execution." },
  { id: "demo-prompt", name: "prompt-engineering.md", section: "Prompt behavior", preview: "Keep answers grounded in support policy and ask a clarifying question when request details are incomplete.", content: "# Prompt behavior\n\nKeep answers grounded in support policy. Ask a clarifying question when the user has not provided enough information." },
  { id: "demo-evaluation", name: "evaluation.md", section: "Required scenarios", preview: "Run all eight evaluation cases and review routing, grounding, and response-format failures.", content: "# Evaluation\n\nRun all eight evaluation scenarios. Save the results and investigate every failed routing, grounding, or response-format check." },
  { id: "demo-checkpoint", name: "checkpoint-1.md", section: "Submission requirements", preview: "Submit the repository URL, a trace screenshot, evaluation output, and a short improvement note.", content: "# Checkpoint 1\n\nInclude your repository URL, one trace screenshot, evaluation output, and a short note describing one improvement." },
  { id: "demo-troubleshooting", name: "troubleshooting.md", section: "Common issues", preview: "If the baseline cannot connect, verify API key names, restart the server, and inspect the trace output.", content: "# Troubleshooting\n\nIf the baseline cannot connect, verify the API key name, restart the development server, and inspect the terminal and trace output." }
];

export const demoSources: LabSource[] = sourceSeed.map((source) => ({
  ...source,
  path: source.name,
  kind: "Markdown",
  status: "Indexed"
}));

const workflowSteps = [
  { order: 1, title: "Read lab objective", purpose: "Understand the helpdesk use case, expected agent behavior, and final deliverables.", instructions: ["Read the lab overview", "Identify the expected agent behavior"], expectedResult: "Lab objective and deliverables are clear.", sources: ["README.md"] },
  { order: 2, title: "Set up repository", purpose: "Prepare the repository and install project dependencies.", instructions: ["Clone the repository", "Install all dependencies"], expectedResult: "Repository is available locally and dependencies install without error.", sources: ["README.md", "setup.md"] },
  { order: 3, title: "Configure environment", purpose: "Create the environment file and add the required API configuration.", instructions: ["Copy the environment example", "Add the required API key", "Restart the development server after changes"], expectedResult: "The environment file exists and required configuration is present.", sources: ["setup.md"] },
  { order: 4, title: "Run baseline agent", purpose: "Verify the starter application before making improvements.", instructions: ["Start the application", "Send one test request", "Inspect the generated trace"], expectedResult: "The app starts without a blocking error, a trace is generated, and the model response is visible.", sources: ["README.md", "setup.md"] },
  { order: 5, title: "Inspect traces", purpose: "Understand how the agent routes requests and calls tools.", instructions: ["Open the latest trace", "Review router output", "Confirm the knowledge tool was called"], expectedResult: "At least one trace is captured and the request flow is understood.", sources: ["architecture.md"] },
  { order: 6, title: "Improve prompt/tool behavior", purpose: "Refine one weak behavior identified in the trace.", instructions: ["Choose one observed issue", "Update the prompt or tool instructions", "Document the reason for the change"], expectedResult: "One behavior is measurably improved and the change is explained.", sources: ["prompt-engineering.md", "architecture.md"] },
  { order: 7, title: "Run evaluation", purpose: "Execute required scenarios and review failed cases.", instructions: ["Run all evaluation scenarios", "Save results", "Review each failure"], expectedResult: "All eight scenarios are executed and results are saved.", sources: ["evaluation.md"] },
  { order: 8, title: "Submit checkpoint", purpose: "Package the evidence required for Checkpoint 1.", instructions: ["Prepare the repository URL", "Attach trace and evaluation evidence", "Write the improvement note"], expectedResult: "All Checkpoint 1 evidence is ready to submit.", sources: ["checkpoint-1.md"] }
];

export const demoGuide: GuideResponse = {
  id: "frontend-demo-guide",
  title: "Day 05 — IT Helpdesk Agent",
  repositoryUrl: "github.com/ai20k/it-helpdesk-agent",
  branch: "main",
  subfolder: "/",
  markdownContent: "",
  status: "completed",
  sources: demoSources.map((source) => ({ path: source.path, createdAt: "2026-09-17T00:00:00.000Z" })),
  structuredContent: {
    title: "Day 05 — IT Helpdesk Agent",
    overview: "Build, inspect, improve, and evaluate a grounded IT Helpdesk Agent.",
    objectives: ["Run the baseline agent", "Inspect traces", "Improve one behavior", "Complete the evaluation"],
    steps: workflowSteps.map((step) => ({ ...step, commands: [] })),
    completionRequirements: [{ content: "Submit the repository, trace, evaluation output, and improvement note.", sources: ["checkpoint-1.md"] }],
    sources: demoSources.map((source) => source.path)
  }
};

export const demoWelcomeMessage: ChatMessage = {
  id: "demo-welcome",
  role: "assistant",
  grounded: true,
  content: "I’ve loaded the Day 05 IT Helpdesk Agent lab. You’re currently on **Step 4 — Run baseline agent**. Ask me what to do next, how to run the project, or what Checkpoint 1 requires.",
  citations: [{ filename: "README.md", section: "Lab overview", quote: "Build and validate the baseline agent before improving its behavior." }]
};

function response(content: string, citations: ChatMessage["citations"]): ChatMessage {
  return { id: `demo-assistant-${Date.now()}`, role: "assistant", content, citations, grounded: true };
}

export function getDemoReply(question: string): ChatMessage {
  const normalized = question.toLowerCase();
  if (normalized.includes("checkpoint") || normalized.includes("require") || normalized.includes("submit") || normalized.includes("nộp")) {
    return response("## Checkpoint 1 requirements\n\nPrepare these four items:\n\n1. Repository URL\n2. One trace screenshot\n3. Evaluation output\n4. A short note describing one improvement\n\nMake sure every link is accessible before submitting.", [
      { filename: "checkpoint-1.md", section: "Submission requirements", quote: "Include your repository URL, one trace screenshot, evaluation output, and a short improvement note." }
    ]);
  }
  if (normalized.includes("run") || normalized.includes("command") || normalized.includes("project") || normalized.includes("chạy") || normalized.includes("lệnh")) {
    return response("## Run the project\n\n```bash\nnpm install\nnpm run dev\n```\n\nThen open the local URL shown in your terminal, send one helpdesk request, and confirm a trace is generated. If you changed environment variables, restart the server first.", [
      { filename: "setup.md", section: "Environment setup", quote: "Configure the required API key, run npm install, then start the project with npm run dev." },
      { filename: "troubleshooting.md", section: "Common issues", quote: "Restart the development server after changing environment configuration." }
    ]);
  }
  if (normalized.includes("source")) {
    return response("The current step is grounded in the lab overview and setup guide. Open either citation to review the relevant source preview.", [
      { filename: "README.md", section: "Lab overview", quote: "Start the application, send a test request, and inspect the generated trace." },
      { filename: "setup.md", section: "Environment setup", quote: "Start the project with npm run dev." }
    ]);
  }
  return response("## Next step: Run the baseline agent\n\n### What to do\n\n1. Start the application\n2. Send one test request\n3. Inspect the generated trace\n\n### Success criteria\n\n- App starts without a blocking error\n- First trace is generated\n- Model response is visible", [
    { filename: "README.md", section: "Lab overview", quote: "Build and validate the baseline agent before improving its behavior." },
    { filename: "setup.md", section: "Environment setup", quote: "Start the project with npm run dev." }
  ]);
}

export function waitForDemo(delay = 650) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
}
