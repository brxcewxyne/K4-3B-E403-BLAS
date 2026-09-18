import { describe, expect, it } from "vitest";
import { WORKFLOW_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { discoverMarkdownFiles } from "@/lib/ingest/github";
import { normalizeSources } from "@/lib/sources/normalize";
import { prepareWorkflowContext, setupScore } from "@/lib/workflow/context";
import type { SourceDocument } from "@/lib/shared/types";

function doc(name: string, content: string, index: number): SourceDocument {
  return {
    id: `source-${index}`,
    name: name.split("/").pop() || name,
    path: name,
    content,
    type: name.toLowerCase().endsWith(".mdx") ? "mdx" : "markdown",
    headings: [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1])
  };
}

describe("recursive Markdown discovery", () => {
  it("ingests nested .md/.mdx files with full paths (TEST 1)", () => {
    const tree = [
      { path: "README.md", type: "blob" },
      { path: "docs/setup.md", type: "blob" },
      { path: "docs/lab/step1.md", type: "blob" },
      { path: "docs/lab/step2.mdx", type: "blob" }
    ];
    const discovery = discoverMarkdownFiles(tree);
    expect(discovery.files).toEqual(["README.md", "docs/setup.md", "docs/lab/step1.md", "docs/lab/step2.mdx"]);
  });

  it("ignores unrelated files and directories (TEST 2)", () => {
    const tree = [
      { path: "README.md", type: "blob" },
      { path: "main.py", type: "blob" },
      { path: "image.png", type: "blob" },
      { path: "docs/setup.md", type: "blob" },
      { path: "docs", type: "tree" }
    ];
    expect(discoverMarkdownFiles(tree).files).toEqual(["README.md", "docs/setup.md"]);
  });

  it("keeps duplicate basenames in different directories distinct (TEST 3)", () => {
    const tree = [
      { path: "README.md", type: "blob" },
      { path: "docs/README.md", type: "blob" }
    ];
    const discovery = discoverMarkdownFiles(tree);
    expect(discovery.files).toEqual(["README.md", "docs/README.md"]);
    const sources = normalizeSources(discovery.files.map((path) => ({ path, content: `# ${path}\nBody text here.` })));
    expect(sources).toHaveLength(2);
    expect(new Set(sources.map((source) => source.id)).size).toBe(2);
    expect(sources.map((source) => source.path)).toEqual(["README.md", "docs/README.md"]);
  });

  it("matches Markdown extensions case-insensitively (TEST 4)", () => {
    const tree = [
      { path: "README.MD", type: "blob" },
      { path: "guide.MdX", type: "blob" }
    ];
    expect(discoverMarkdownFiles(tree).files).toEqual(["README.MD", "guide.MdX"]);
  });

  it("collapses exact duplicates but keeps same-path different-content files", () => {
    const dupes = normalizeSources([
      { path: "docs/setup.md", content: "# Setup\nSame body text." },
      { path: "docs/setup.md", content: "# Setup\nSame body text." }
    ]);
    expect(dupes).toHaveLength(1);
    const distinct = normalizeSources([
      { path: "docs/setup.md", content: "# Setup\nFirst version here." },
      { path: "docs/setup.md", content: "# Setup\nSecond version here." }
    ]);
    expect(distinct).toHaveLength(2);
  });
});

describe("setup evidence", () => {
  it("ranks explicit venv documentation above generic notes (TEST 5)", () => {
    const venvDoc = doc("docs/setup.md", "# Setup\nRun python -m venv .venv to create the environment.", 0);
    const generic = doc("notes.md", "# Notes\nGeneral remarks about the lab.", 1);
    expect(setupScore(venvDoc)).toBeGreaterThan(0);
    expect(setupScore(venvDoc)).toBeGreaterThan(setupScore(generic));
  });

  it("requires recommendation labeling and forbids invented commands (TEST 6)", () => {
    expect(WORKFLOW_SYSTEM_PROMPT).toContain("Recommended setup (not explicitly required by the source)");
    expect(WORKFLOW_SYSTEM_PROMPT).toContain("never reproduce commands the sources do not document");
    expect(WORKFLOW_SYSTEM_PROMPT).toContain("Do not invent facts");
  });

  it("guarantees nested setup docs a context slot past the document cap (TEST 7)", () => {
    const guides = Array.from({ length: 11 }, (_, index) =>
      doc(`lab-guide-checkpoint-${index}.md`, `# Lab checkpoint ${index}\n\nFollow the lab checkpoint instructions carefully and completely.`, index)
    );
    const setup = doc(
      "docs/environment/setup.md",
      "# Environment setup\n\n## Python virtual environment\n\nRun python -m venv .venv then install dependencies.",
      11
    );
    const context = prepareWorkflowContext([...guides, setup]);
    expect(context.payload).toContain("python -m venv");
    expect(context.setupEvidence.map((entry) => entry.path)).toContain("docs/environment/setup.md");
    expect(context.setupEvidence.length).toBeGreaterThan(0);
  });

  it("keeps conflicting sources side by side instead of merging them (TEST 8)", () => {
    const context = prepareWorkflowContext([
      doc("setup.md", "# Installation\nRun pip install -r requirements.txt for dependencies.", 0),
      doc("docs/setup.md", "# Installation\nRun poetry install for dependencies.", 1)
    ]);
    expect(context.payload).toContain("pip install");
    expect(context.payload).toContain("poetry install");
  });
});
