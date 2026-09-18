import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/shared/api";
import { discoverMarkdownFiles, ensureDocumentationDiscovered, ingestGitHubRepository } from "@/lib/ingest/github";

function treeResponse(tree: Array<{ path: string; type: string; size?: number }>) {
  return { ok: true, status: 200, json: async () => ({ default_branch: "main", truncated: false, tree }) };
}

function stubRepoFetch(tree: Array<{ path: string; type: string; size?: number }>, failPaths: string[] = []) {
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("/git/trees/")) return treeResponse(tree);
    if (url.includes("api.github.com/repos/")) {
      return { ok: true, status: 200, json: async () => ({ default_branch: "main" }) };
    }
    if (failPaths.some((path) => url.endsWith(`/${path}`))) {
      return { ok: false, status: 404, text: async () => "" };
    }
    return { ok: true, status: 200, text: async () => `# Doc\n\nReadable body content for testing purposes.` };
  });
  return () => vi.unstubAllGlobals();
}

describe("documentation inventory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects repositories without documentation before workflow starts (TEST 21)", () => {
    // Non-documentation files are invisible to discovery.
    expect(discoverMarkdownFiles([
      { path: "main.py", type: "blob" },
      { path: "package.json", type: "blob" },
      { path: "image.png", type: "blob" }
    ]).files).toEqual([]);
    try {
      ensureDocumentationDiscovered([]);
      expect.unreachable("must throw NO_DOCUMENTATION_FILES");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("NO_DOCUMENTATION_FILES");
      expect((error as Error).message).toContain(".md, .mdx, or .txt");
    }
  });

  it("discovers .md, .mdx and .txt documentation (TEST 22)", () => {
    const discovery = discoverMarkdownFiles([
      { path: "README.md", type: "blob" },
      { path: "docs/setup.mdx", type: "blob" },
      { path: "notes.txt", type: "blob" },
      { path: "main.py", type: "blob" }
    ]);
    expect(discovery.files).toEqual(["README.md", "docs/setup.mdx", "notes.txt"]);
  });

  it("reports partial failure with paths and proceeds on success (TEST 23)", async () => {
    const restore = stubRepoFetch([
      { path: "README.md", type: "blob" },
      { path: "docs/setup.md", type: "blob" },
      { path: "labs/task.mdx", type: "blob" }
    ], ["docs/setup.md"]);
    try {
      const result = await ingestGitHubRepository("https://github.com/org/repo");
      expect(result.sources).toHaveLength(2);
      expect(result.ingestionComplete).toBe(false);
      expect(result.markdownFilesDiscovered).toBe(3);
      expect(result.markdownFilesIngested).toBe(2);
      expect(result.markdownFilesFailed).toBe(1);
      expect(result.failedSources).toEqual([{ path: "docs/setup.md", reason: expect.any(String) }]);
      expect(result.sources.map((source) => source.path).sort()).toEqual(["README.md", "labs/task.mdx"]);
    } finally {
      restore();
    }
  });

  it("fails cleanly when every documentation file is unreadable (TEST 24)", async () => {
    const restore = stubRepoFetch([
      { path: "README.md", type: "blob" },
      { path: "guide.mdx", type: "blob" }
    ], ["README.md", "guide.mdx"]);
    try {
      await ingestGitHubRepository("https://github.com/org/repo");
      expect.unreachable("must throw DOCUMENTATION_READ_FAILED");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("DOCUMENTATION_READ_FAILED");
    } finally {
      restore();
    }
  });
});

describe("workflow layout contracts", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const desktopCss = css.split("@media")[0];

  it("parks the closed workflow toggle at middle-right, away from Logs (TEST 25)", () => {
    expect(desktopCss).toContain(".workflow-trigger { position: fixed; right: 18px; top: 50%;");
    expect(desktopCss).toContain("transform: translateY(-50%);");
  });

  it("sizes the open panel wider with a solid footer and no overlap (TEST 26)", () => {
    expect(css).toContain("--workflow-w: clamp(480px, 34vw, 560px);");
    expect(desktopCss).toContain(".workspace.workflow-open .workflow-col { min-width: 480px; max-width: 580px; }");
    expect(css).toContain("background: rgba(13, 15, 20, .94);");
    expect(css).toContain(".workflow-status { display: grid; width: 100%;");
  });
});
