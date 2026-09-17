import type { ApiResult, ChatAnswer, ChatTurn, LabWorkflow, SourceDocument } from "../shared/types";

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
  return data<{ workflow: LabWorkflow }>(await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources }) }));
}

export async function askLabGuide(input: { question: string; sources: SourceDocument[]; workflow: LabWorkflow; currentStep?: string; history?: ChatTurn[] }) {
  return data<ChatAnswer>(await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
}
