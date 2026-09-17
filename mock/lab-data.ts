export type LabSource = {
  id: string;
  name: string;
  kind: "Markdown" | "Repository" | "Archive";
  status: "Ready" | "Processing" | "Indexed";
  section: string;
  preview: string;
};

export type Citation = { filename: string; section: string; quote: string };

export type MockMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: string[];
  citations?: Citation[];
};

export type WorkflowStep = {
  id: number;
  title: string;
  description: string;
  criteria: string[];
};

export const lab = {
  title: "AI20k — Day 05 Agent Lab",
  subtitle: "IT Helpdesk Agent",
  goal: "Complete AI Agent Lab",
  checkpoint: "Checkpoint 1"
};

export const sources: LabSource[] = [
  { id: "readme", name: "README.md", kind: "Markdown", status: "Ready", section: "Lab overview", preview: "Build an IT Helpdesk Agent that classifies requests, retrieves support knowledge, and recommends the next action." },
  { id: "setup", name: "setup.md", kind: "Markdown", status: "Ready", section: "Environment setup", preview: "Create a .env file, configure the required API keys, then start the development server with npm run dev." },
  { id: "architecture", name: "architecture.md", kind: "Markdown", status: "Ready", section: "Agent architecture", preview: "The baseline agent uses a router, a support knowledge tool, and a structured response formatter." },
  { id: "prompt", name: "prompt-engineering.md", kind: "Markdown", status: "Ready", section: "Prompt behavior", preview: "Keep answers grounded in support policy and ask a clarifying question when request details are incomplete." },
  { id: "evaluation", name: "evaluation.md", kind: "Markdown", status: "Ready", section: "Required scenarios", preview: "Run all eight evaluation cases. The agent must pass routing, grounding, and response-format checks." },
  { id: "checkpoint", name: "checkpoint-1.md", kind: "Markdown", status: "Ready", section: "Submission requirements", preview: "Submit the repository URL, a trace screenshot, evaluation output, and a short note describing one improvement." },
  { id: "troubleshooting", name: "troubleshooting.md", kind: "Markdown", status: "Ready", section: "Common issues", preview: "If the baseline cannot connect, verify API key names, restart the dev server, and inspect the trace output." }
];

export const workflow: WorkflowStep[] = [
  { id: 1, title: "Read lab objective", description: "Understand the helpdesk use case, expected agent behavior, and final deliverables.", criteria: ["Lab objective is clear", "Required deliverables are identified"] },
  { id: 2, title: "Set up repository", description: "Clone the lab repository and install all project dependencies.", criteria: ["Repository is available locally", "Dependencies install without error"] },
  { id: 3, title: "Configure environment", description: "Create the environment file and add the required API configuration.", criteria: [".env file exists", "Required API key is configured"] },
  { id: 4, title: "Run baseline agent", description: "Start the starter application and verify the baseline helpdesk flow before making changes.", criteria: ["Application starts without error", "Demo page loads", "API connection is verified"] },
  { id: 5, title: "Inspect traces", description: "Run a sample support request and inspect how the agent routes and calls tools.", criteria: ["At least one trace is captured", "Router and tool calls are understood"] },
  { id: 6, title: "Improve prompt/tool behavior", description: "Refine the system prompt or tool instructions based on trace observations.", criteria: ["One behavior is improved", "Change is explained in notes"] },
  { id: 7, title: "Run evaluation", description: "Execute the required evaluation scenarios and review failed cases.", criteria: ["All scenarios are executed", "Results are saved"] },
  { id: 8, title: "Submit checkpoint", description: "Package the evidence required for Checkpoint 1 and submit the repository link.", criteria: ["Repository link is ready", "Trace and evaluation evidence are attached"] }
];

export const initialMessages: MockMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: "Chào bạn. Tôi đã đọc 7 tài liệu của Day 05 Lab. Bạn đang ở bước 4: chạy baseline agent. Tôi có thể chỉ ra việc cần làm tiếp theo và dẫn đúng nguồn trong repository.",
    citations: [{ filename: "README.md", section: "Lab overview", quote: "Build and validate the baseline IT Helpdesk Agent before improving its behavior." }]
  },
  { id: "user-example", role: "user", content: "Tôi đã clone repo và cài dependencies rồi. Tiếp theo làm gì?" },
  {
    id: "assistant-example",
    role: "assistant",
    content: "Bước tiếp theo là cấu hình API key và chạy project lần đầu.",
    steps: ["Tạo file `.env` từ file mẫu", "Thêm `OPENAI_API_KEY`", "Chạy `npm run dev`", "Xác nhận trang demo mở thành công"],
    citations: [
      { filename: "setup.md", section: "Environment setup · lines 12–18", quote: "Create a `.env` file and configure the required API keys." },
      { filename: "README.md", section: "Run locally · lines 30–34", quote: "Run the development server and open the demo page." }
    ]
  }
];

const replySets: Array<{ keywords: string[]; reply: Omit<MockMessage, "id" | "role"> }> = [
  {
    keywords: ["checkpoint", "nộp", "submit"],
    reply: { content: "Checkpoint 1 cần bốn phần: repository URL, ảnh chụp trace, kết quả evaluation và một ghi chú ngắn về cải tiến bạn đã thực hiện.", citations: [{ filename: "checkpoint-1.md", section: "Submission requirements · lines 8–19", quote: "Include your repository, one trace, evaluation output, and an improvement note." }] }
  },
  {
    keywords: ["lệnh", "chạy", "run", "baseline"],
    reply: { content: "Tại thư mục gốc của project, hãy kiểm tra file `.env` rồi chạy baseline bằng lệnh sau.", steps: ["Chạy `npm run dev`", "Mở `http://localhost:3000`", "Gửi một support request mẫu", "Kiểm tra trace được tạo"], citations: [{ filename: "setup.md", section: "Start the application · lines 20–27", quote: "Start the development server with `npm run dev`." }, { filename: "troubleshooting.md", section: "Connection issues", quote: "Restart the server after changing environment variables." }] }
  },
  {
    keywords: ["tiếp", "next", "xong setup", "bắt đầu"],
    reply: { content: "Sau setup, bạn cần chạy baseline agent trước khi chỉnh prompt. Mục tiêu là xác nhận ứng dụng, API và trace đều hoạt động ở trạng thái ban đầu.", steps: ["Khởi động dev server", "Mở demo page", "Gửi một yêu cầu IT mẫu", "Mở trace và kiểm tra router"], citations: [{ filename: "README.md", section: "Baseline validation", quote: "Validate the starter agent before implementing improvements." }, { filename: "architecture.md", section: "Request flow", quote: "Requests pass through the router before the support knowledge tool is called." }] }
  }
];

export function mockReplyFor(question: string): MockMessage {
  const normalized = question.toLowerCase();
  const match = replySets.find((set) => set.keywords.some((keyword) => normalized.includes(keyword)));
  const fallback = {
    content: "Theo workflow hiện tại, bạn nên hoàn tất bước chạy baseline agent và kiểm tra trace trước khi cải tiến prompt hoặc tool behavior.",
    steps: ["Chạy ứng dụng", "Thử một support request", "Kiểm tra trace", "Đánh dấu bước hiện tại là hoàn thành"],
    citations: [{ filename: "README.md", section: "Lab workflow", quote: "Run the baseline, inspect traces, then improve agent behavior." }, { filename: "architecture.md", section: "Agent architecture", quote: "Use traces to verify routing and tool execution." }]
  };
  return { id: `assistant-${Date.now()}`, role: "assistant", ...(match?.reply || fallback) };
}
