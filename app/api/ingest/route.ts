import { ingestGitHubRepository } from "@/lib/ingest/github";
import { failure, success, AppError } from "@/lib/shared/api";
import { isVerboseEvalLogs, logEvent } from "@/lib/logging/logger";
import { summarizeSourceMeta } from "@/lib/logging/redact";
import { normalizeSources } from "@/lib/sources/normalize";
import type { SourceDocument } from "@/lib/shared/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function logIngestCompleted(input: { repoId: string; repository: string | null; branch: string | null; sources: SourceDocument[]; startedAt: number }) {
  logEvent({
    eventType: "source_ingest_completed",
    repoId: input.repoId,
    data: {
      repository: input.repository,
      branch: input.branch,
      fileCount: input.sources.length,
      files: input.sources.map((source) => summarizeSourceMeta(source)),
      ...(isVerboseEvalLogs() ? { verboseEvalLogs: true } : {}),
      durationMs: Date.now() - input.startedAt
    }
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as { repositoryUrl?: unknown };
      if (typeof body.repositoryUrl !== "string") throw new AppError("INVALID_INPUT", "repositoryUrl is required.");
      logEvent({ eventType: "source_ingest_started", data: { inputKind: "repository", repositoryUrl: body.repositoryUrl } });
      const result = await ingestGitHubRepository(body.repositoryUrl);
      const repoId = result.repository.replace("https://github.com/", "");
      logIngestCompleted({ repoId, repository: result.repository, branch: result.branch, sources: result.sources, startedAt });
      return success(result);
    }
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("files");
      if (!files.length || files.some((file) => !(file instanceof File))) throw new AppError("INVALID_INPUT", "Upload at least one Markdown file.");
      logEvent({ eventType: "source_ingest_started", data: { inputKind: "files", fileCount: files.length, fileNames: (files as File[]).map((file) => file.name) } });
      const raw = await Promise.all((files as File[]).map(async (file) => {
        if (!/\.(md|mdx)$/i.test(file.name)) throw new AppError("UNSUPPORTED_FILE", `${file.name} must use .md or .mdx.`);
        if (file.size > 1_000_000) throw new AppError("FILE_TOO_LARGE", `${file.name} exceeds the 1 MB limit.`);
        return { path: file.name, content: await file.text() };
      }));
      const result = { repository: null, branch: null, sources: normalizeSources(raw) };
      logIngestCompleted({ repoId: "local-files", repository: null, branch: null, sources: result.sources, startedAt });
      return success(result);
    }
    throw new AppError("UNSUPPORTED_CONTENT_TYPE", "Use JSON for GitHub ingestion or multipart form data for uploads.", 415);
  } catch (error) {
    logEvent({
      eventType: "source_ingest_failed",
      data: {
        errorCode: error instanceof AppError ? error.code : "UNKNOWN",
        durationMs: Date.now() - startedAt
      }
    });
    return failure(error);
  }
}
