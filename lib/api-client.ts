import type { GuideResponse } from "./client-types";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");

export const API_BASE_URL = configuredBaseUrl || "";

function endpoint(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export async function createDemoGuide() {
  return readJson<{ id: string }>(await fetch(endpoint("/api/guides/demo"), { method: "POST" }));
}

export async function importGithubGuide(repositoryUrl: string) {
  return readJson<{ id: string; title: string; filesFound: string[] }>(
    await fetch(endpoint("/api/guides/from-github"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repositoryUrl, branch: "main", subfolder: "/" })
    })
  );
}

export async function importZipGuide(file: File) {
  const form = new FormData();
  form.set("file", file);
  form.set("subfolder", "/");
  return readJson<{ id: string; title: string; filesFound: string[] }>(
    await fetch(endpoint("/api/guides/from-zip"), { method: "POST", body: form })
  );
}

export async function getGuide(id: string) {
  return readJson<GuideResponse>(await fetch(endpoint(`/api/guides/${id}`), { cache: "no-store" }));
}

export async function getGuideSources(id: string) {
  return readJson<{
    guideId: string;
    sources: Array<{ id: string; path: string; content: string; createdAt: string }>;
  }>(await fetch(endpoint(`/api/guides/${id}/sources`), { cache: "no-store" }));
}

export async function askGuide(input: { guideId: string; message: string; sessionId?: string }) {
  return readJson<{
    sessionId: string;
    answer: string;
    sources: Array<{ file: string; section: string }>;
  }>(
    await fetch(endpoint(`/api/guides/${input.guideId}/chat`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.message, sessionId: input.sessionId })
    })
  );
}
