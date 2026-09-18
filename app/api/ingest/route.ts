import { ingestGitHubRepository } from "@/lib/ingest/github";
import { failure, success, AppError } from "@/lib/shared/api";
import { isVerboseEvalLogs, logEvent } from "@/lib/logging/logger";
import { summarizeSourceMeta } from "@/lib/logging/redact";
import { normalizeSources } from "@/lib/sources/normalize";
import type { SourceDocument } from "@/lib/shared/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function logIngestCompleted(input: { repoId: string; repository: string | null; branch: string | null; sources: SourceDocument[]; startedAt: number; discovered?: number; failed?: number; ingestionComplete?: boolean }) {
  logEvent({
    eventType: "source_ingest_completed",
    repoId: input.repoId,
    data: {
      repository: input.repository,
      branch: input.branch,
      fileCount: input.sources.length,
      markdownFilesDiscovered: input.discovered ?? input.sources.length,
      markdownFilesIngested: input.sources.length,
      markdownFilesFailed: input.failed ?? 0,
      ingestionComplete: input.ingestionComplete ?? true,
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
      logIngestCompleted({ repoId, repository: result.repository, branch: result.branch, sources: result.sources, startedAt, discovered: result.markdownFilesDiscovered, failed: result.markdownFilesFailed, ingestionComplete: result.ingestionComplete });
      return success(result);
    }
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("files");
      if (!files.length || files.some((file) => !(file instanceof File))) throw new AppError("INVALID_INPUT", "Upload at least one Markdown file.");
      // Optional folder-upload paths (webkitRelativePath per file index); falls back to File.name.
      let pathOverride: string[] = [];
      const pathsField = form.get("paths");
      if (typeof pathsField === "string" && pathsField) {
        try {
          const parsedPaths: unknown = JSON.parse(pathsField);
          if (Array.isArray(parsedPaths)) pathOverride = parsedPaths.map((entry) => String(entry));
        } catch {
          pathOverride = [];
        }
      }
      const uploads = files as File[];
      logEvent({ eventType: "source_ingest_started", data: { inputKind: "files", fileCount: uploads.length, fileNames: uploads.map((file) => file.name) } });
      // One unreadable file must not abort the whole batch: skip it loudly.
      const raw: Array<{ path: string; content: string }> = [];
      const warnings: string[] = [];
      for (let index = 0; index < uploads.length; index += 1) {
        const file = uploads[index];
        const path = (pathOverride[index] || file.name).replace(/\\/g, "/").replace(/^\.?\//, "");
        if (!/\.(md|mdx)$/i.test(path)) {
          warnings.push(`Skipped ${path || file.name}: not a Markdown file.`);
          continue;
        }
        if (file.size > 1_000_000) {
          warnings.push(`Skipped ${path}: exceeds the 1 MB limit.`);
          continue;
        }
        const content = await file.text();
        if (!content.trim()) {
          warnings.push(`Skipped ${path}: file is empty.`);
          continue;
        }
        raw.push({ path, content });
      }
      if (!raw.length) {
        if (warnings.length) throw new AppError("NO_MARKDOWN", warnings[0]);
        throw new AppError("INVALID_INPUT", "Upload at least one Markdown file.");
      }
      const result = { repository: null, branch: null, sources: normalizeSources(raw), warnings, ingestionComplete: warnings.length === 0 };
      logIngestCompleted({ repoId: "local-files", repository: null, branch: null, sources: result.sources, startedAt, discovered: uploads.length, failed: warnings.length, ingestionComplete: result.ingestionComplete });
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
