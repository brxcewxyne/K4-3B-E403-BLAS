import { AppError } from "../shared/api";
import { MAX_MARKDOWN_FILES, normalizeSources } from "../sources/normalize";

const IGNORED_SEGMENTS = new Set([".git", "node_modules", ".next", "dist", "build", "coverage", "vendor", ".cache"]);

export function parseGitHubRepositoryUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new AppError("INVALID_GITHUB_URL", "Enter a valid public GitHub repository URL."); }
  if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
    throw new AppError("INVALID_GITHUB_URL", "Only https://github.com/<owner>/<repo> URLs are supported.");
  }
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AppError("INVALID_GITHUB_URL", "Use a repository URL such as https://github.com/owner/repo.");
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) throw new AppError("INVALID_GITHUB_URL", "The GitHub owner or repository name is invalid.");
  return { owner, repo, repositoryUrl: `https://github.com/${owner}/${repo}` };
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "ai20k-lab-guide" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store"
  });
  if (response.status === 404) throw new AppError("REPOSITORY_NOT_FOUND", "The public GitHub repository was not found.", 404);
  if (response.status === 403 || response.status === 429) throw new AppError("GITHUB_RATE_LIMIT", "GitHub rate limit reached. Try again later.", 429);
  if (!response.ok) throw new AppError("GITHUB_ERROR", `GitHub returned HTTP ${response.status}.`, 502);
  return response.json() as Promise<T>;
}

export type TreeBlob = { path: string; type: string; size?: number };

export type MarkdownDiscovery = {
  /** Full repository-relative paths of Markdown/MDX blobs, in tree order. */
  files: string[];
  /** True when every discovered file is represented (no skips). */
  complete: boolean;
};

/**
 * Pure recursive-tree filter: every `.md`/`.mdx` blob (case-insensitive),
 * full paths preserved so identical basenames in different directories stay
 * distinct. Build/tooling directories are excluded.
 */
export function discoverMarkdownFiles(tree: TreeBlob[]): MarkdownDiscovery {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const item of tree) {
    if (item.type !== "blob") continue;
    if (!/\.(md|mdx)$/i.test(item.path)) continue;
    if (item.path.split("/").some((segment) => IGNORED_SEGMENTS.has(segment))) continue;
    if ((item.size || 0) > 1_000_000) continue;
    const normalized = item.path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    files.push(item.path);
  }
  return { files, complete: true };
}

export type IngestionInventory = {
  repository: string;
  branch: string;
  sources: ReturnType<typeof normalizeSources>;
  warnings: string[];
  ingestionComplete: boolean;
  markdownFilesDiscovered: number;
  markdownFilesIngested: number;
  markdownFilesFailed: number;
};

export async function ingestGitHubRepository(value: string): Promise<IngestionInventory> {
  const parsed = parseGitHubRepositoryUrl(value);
  const metadata = await githubJson<{ default_branch: string }>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
  const branch = metadata.default_branch;
  const tree = await githubJson<{ truncated: boolean; tree: TreeBlob[] }>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  const warnings: string[] = [];
  if (tree.truncated) {
    warnings.push("GitHub truncated the repository file list, so some files may be missing from this import.");
  }

  const discovered = discoverMarkdownFiles(tree.tree);
  const files = discovered.files;
  if (!files.length) throw new AppError("NO_MARKDOWN", "No Markdown or MDX files were found in this repository.");
  if (files.length > MAX_MARKDOWN_FILES) throw new AppError("TOO_MANY_FILES", `The repository contains ${files.length} Markdown files; the limit is ${MAX_MARKDOWN_FILES}.`);

  // One unreadable file must not abort the whole import: skip it loudly.
  const documents: Array<{ path: string; content: string; repository: string }> = [];
  let failed = 0;
  for (let index = 0; index < files.length; index += 8) {
    const batch = files.slice(index, index + 8);
    const results = await Promise.all(batch.map(async (path) => {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}/${path.split("/").map(encodeURIComponent).join("/")}`;
        const response = await fetch(rawUrl, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const content = await response.text();
        if (!content.trim()) throw new Error("empty content");
        if (Buffer.byteLength(content, "utf8") > 1_000_000) throw new Error("exceeds 1 MB");
        return { ok: true as const, path, content };
      } catch {
        failed += 1;
        warnings.push(`Skipped ${path}: could not be read from GitHub.`);
        return { ok: false as const, path };
      }
    }));
    for (const item of results) {
      if (item.ok) documents.push({ path: item.path, content: item.content, repository: parsed.repositoryUrl });
    }
  }
  if (!documents.length) throw new AppError("NO_MARKDOWN", "No readable Markdown or MDX files were found in this repository.");
  const ingestionComplete = !tree.truncated && failed === 0;
  return {
    repository: parsed.repositoryUrl,
    branch,
    sources: normalizeSources(documents),
    warnings,
    ingestionComplete,
    markdownFilesDiscovered: files.length,
    markdownFilesIngested: documents.length,
    markdownFilesFailed: failed
  };
}
