import type { ApiResult, ChatAnswer, ChatTurn, LabWorkflow, SourceDocument } from "../shared/types";

const SESSION_STORAGE_KEY = "ai20k-opencode-session";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let inMemorySessionId = "";

function createSessionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function providerSessionId() {
  if (inMemorySessionId) return inMemorySessionId;
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored && UUID_PATTERN.test(stored)) return (inMemorySessionId = stored);
    const created = createSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return (inMemorySessionId = created);
  } catch {
    return (inMemorySessionId = createSessionId());
  }
}

async function data<T>(response: Response): Promise<T> {
  const result = await response.json() as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export async function ingestRepository(repositoryUrl: string) {
  return data<{ repository: string; branch: string; sources: SourceDocument[] }>(await fetch("/api/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repositoryUrl }) }));
}

export async function ingestFiles(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  return data<{ repository: null; branch: null; sources: SourceDocument[] }>(await fetch("/api/ingest", { method: "POST", body: form }));
}

export async function generateWorkflow(sources: SourceDocument[]) {
  return data<{ workflow: LabWorkflow }>(await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources, sessionId: providerSessionId() }) }));
}

export async function askLabGuide(input: { question: string; sources: SourceDocument[]; workflow: LabWorkflow; currentStep?: string; history?: ChatTurn[] }) {
  return data<ChatAnswer>(await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, sessionId: providerSessionId() }) }));
}
