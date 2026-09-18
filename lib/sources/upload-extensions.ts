/** Extensions for files manually added from outside the repository. */
export const MANUAL_UPLOAD_EXTENSIONS = ["md", "mdx", "txt"] as const;

/** Extensions discovered inside repository imports (unchanged behavior). */
export const REPOSITORY_SOURCE_EXTENSIONS = ["md", "mdx"] as const;

export const MANUAL_UPLOAD_ERROR = "Only .md, .mdx, and .txt files are supported for external uploads.";

/**
 * Source origin derived from existing metadata — no schema change.
 * Repository imports carry `repository`; manual/external uploads do not.
 */
export function getSourceOrigin(source: { repository?: string | null }): "repository" | "manual" {
  return source.repository ? "repository" : "manual";
}

/** Lowercase extension without the dot; "" when the name has none. */
export function extensionOf(filename: string): string {
  const base = filename.split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isSupportedExtension(filename: string, allowed: readonly string[] = MANUAL_UPLOAD_EXTENSIONS): boolean {
  return allowed.includes(extensionOf(filename));
}

/** Split picked filenames into accepted/rejected without discarding either side. */
export function partitionFilenames(names: string[], allowed: readonly string[] = MANUAL_UPLOAD_EXTENSIONS): { accepted: string[]; rejected: string[] } {
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const name of names) {
    (isSupportedExtension(name, allowed) ? accepted : rejected).push(name);
  }
  return { accepted, rejected };
}
