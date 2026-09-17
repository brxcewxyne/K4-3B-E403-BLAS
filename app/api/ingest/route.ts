import { ingestGitHubRepository } from "@/lib/ingest/github";
import { failure, success, AppError } from "@/lib/shared/api";
import { normalizeSources } from "@/lib/sources/normalize";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as { repositoryUrl?: unknown };
      if (typeof body.repositoryUrl !== "string") throw new AppError("INVALID_INPUT", "repositoryUrl is required.");
      return success(await ingestGitHubRepository(body.repositoryUrl));
    }
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const files = form.getAll("files");
      if (!files.length || files.some((file) => !(file instanceof File))) throw new AppError("INVALID_INPUT", "Upload at least one Markdown file.");
      const raw = await Promise.all((files as File[]).map(async (file) => {
        if (!/\.(md|mdx)$/i.test(file.name)) throw new AppError("UNSUPPORTED_FILE", `${file.name} must use .md or .mdx.`);
        if (file.size > 1_000_000) throw new AppError("FILE_TOO_LARGE", `${file.name} exceeds the 1 MB limit.`);
        return { path: file.name, content: await file.text() };
      }));
      return success({ repository: null, branch: null, sources: normalizeSources(raw) });
    }
    throw new AppError("UNSUPPORTED_CONTENT_TYPE", "Use JSON for GitHub ingestion or multipart form data for uploads.", 415);
  } catch (error) { return failure(error); }
}
