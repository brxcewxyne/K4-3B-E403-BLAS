import { AppError } from "../shared/api";
import { hashString } from "../logging/redact";
import { extensionOf, isSupportedExtension, REPOSITORY_SOURCE_EXTENSIONS } from "./upload-extensions";
import type { SourceDocument, SourceType } from "../shared/types";

export const MAX_MARKDOWN_FILES = 50;
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_COMBINED_BYTES = 2_000_000;

export function extractHeadings(content: string) {
  return [...content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => match[1].trim()).slice(0, 200);
}

function stableId(path: string, index: number) {
  const slug = path.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(-60) || "source";
  return `${slug}-${index + 1}`;
}

export function normalizeSources(
  input: Array<{ path: string; content: string; repository?: string }>,
  options: { extensions?: readonly string[] } = {}
): SourceDocument[] {
  const allowedExtensions = options.extensions || REPOSITORY_SOURCE_EXTENSIONS;
  if (!input.length) throw new AppError("NO_MARKDOWN", "No Markdown or MDX files were found.");
  // Collapse exact duplicates (same normalized path and content, e.g. a file
  // picked twice). Same paths with different content are kept as-is.
  const seen = new Set<string>();
  const deduped = input.filter((item) => {
    const fingerprint = `${item.path.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase()}::${hashString(item.content)}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
  if (!deduped.length) throw new AppError("NO_MARKDOWN", "No Markdown or MDX files were found.");
  if (deduped.length > MAX_MARKDOWN_FILES) throw new AppError("TOO_MANY_FILES", `A maximum of ${MAX_MARKDOWN_FILES} Markdown files is supported.`);

  let combined = 0;
  return deduped.map((item, index) => {
    const path = item.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const extension = extensionOf(path);
    if (!isSupportedExtension(path, allowedExtensions)) {
      throw new AppError("UNSUPPORTED_FILE", `${path || "File"} must use ${allowedExtensions.map((entry) => `.${entry}`).join(", ")}.`);
    }
    const type: SourceType = extension === "mdx" ? "mdx" : "markdown";
    const bytes = Buffer.byteLength(item.content, "utf8");
    if (!bytes) throw new AppError("EMPTY_FILE", `${path} is empty.`);
    if (bytes > MAX_FILE_BYTES) throw new AppError("FILE_TOO_LARGE", `${path} exceeds the 1 MB limit.`);
    combined += bytes;
    if (combined > MAX_COMBINED_BYTES) throw new AppError("SOURCES_TOO_LARGE", "Combined Markdown content exceeds the 2 MB limit.");
    return {
      id: stableId(path, index),
      name: path.split("/").pop() || path,
      path,
      content: item.content.replace(/\r\n/g, "\n"),
      type,
      repository: item.repository,
      headings: extractHeadings(item.content)
    };
  });
}
