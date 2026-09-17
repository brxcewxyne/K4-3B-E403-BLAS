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

export async function ingestGitHubRepository(value: string) {
  const parsed = parseGitHubRepositoryUrl(value);
  const metadata = await githubJson<{ default_branch: string }>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
  const branch = metadata.default_branch;
  const tree = await githubJson<{ truncated: boolean; tree: Array<{ path: string; type: string; size?: number }> }>(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (tree.truncated) throw new AppError("REPOSITORY_TOO_LARGE", "This repository is too large for lightweight ingestion. Choose a smaller lab repository.");

  const files = tree.tree.filter((item) => {
    const segments = item.path.split("/");
    return item.type === "blob" && /\.(md|mdx)$/i.test(item.path) && !segments.some((segment) => IGNORED_SEGMENTS.has(segment)) && (item.size || 0) <= 1_000_000;
  });
  if (!files.length) throw new AppError("NO_MARKDOWN", "No Markdown or MDX files were found in this repository.");
  if (files.length > MAX_MARKDOWN_FILES) throw new AppError("TOO_MANY_FILES", `The repository contains ${files.length} Markdown files; the limit is ${MAX_MARKDOWN_FILES}.`);

  const documents: Array<{ path: string; content: string; repository: string }> = [];
  for (let index = 0; index < files.length; index += 8) {
    const batch = files.slice(index, index + 8);
    const results = await Promise.all(batch.map(async (file) => {
      const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
      const response = await fetch(rawUrl, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (!response.ok) throw new AppError("GITHUB_FILE_ERROR", `Could not read ${file.path} from GitHub.`, 502);
      return { path: file.path, content: await response.text(), repository: parsed.repositoryUrl };
    }));
    documents.push(...results);
  }
  return { repository: parsed.repositoryUrl, branch, sources: normalizeSources(documents) };
}
