import { describe, expect, it } from "vitest";
import { checkLabScope, outOfScopeResponse, OUT_OF_SCOPE_EN, OUT_OF_SCOPE_VI } from "@/lib/chat/scope";
import { normalizeSources } from "@/lib/sources/normalize";
import { getSourceOrigin, isSupportedExtension, MANUAL_UPLOAD_ERROR, partitionFilenames } from "@/lib/sources/upload-extensions";
import { progressStorageKey } from "@/lib/workflow/progress";
import type { SourceDocument } from "@/lib/shared/types";
import type { ScopeContext } from "@/lib/chat/scope";

const genericLab: ScopeContext = {
  labTitle: "AI Lab",
  fileNames: ["README.md", "setup.md"],
  headings: ["Setup", "Overview"],
  stepTitles: ["Start the project"]
};

describe("lab-scoped chat guard", () => {
  it("rejects clearly unrelated questions locally (TEST C)", () => {
    const verdict = checkLabScope("What is the weather today?", genericLab);
    expect(verdict.inScope).toBe(false);
    expect(outOfScopeResponse("What is the weather today?")).toBe(OUT_OF_SCOPE_EN);
  });

  it("replies in Vietnamese for Vietnamese questions", () => {
    const verdict = checkLabScope("Thời tiết hôm nay thế nào?", genericLab);
    expect(verdict.inScope).toBe(false);
    expect(outOfScopeResponse("Thời tiết hôm nay thế nào?")).toBe(OUT_OF_SCOPE_VI);
  });

  it("allows conceptual questions matching the lab (TEST D)", () => {
    const verdict = checkLabScope("What is prompt engineering?", {
      labTitle: "Prompt Engineering & Tool Calling",
      fileNames: ["README.md"],
      headings: ["Overview"],
      stepTitles: ["Start"]
    });
    expect(verdict.inScope).toBe(true);
  });

  it("allows workflow questions (TEST E)", () => {
    expect(checkLabScope("What should I do next?", genericLab).inScope).toBe(true);
    expect(checkLabScope("What is required for checkpoint 1?", genericLab).inScope).toBe(true);
    expect(checkLabScope("How do I run this lab?", genericLab).inScope).toBe(true);
  });

  it("allows ambiguous questions instead of false-rejecting", () => {
    expect(checkLabScope("Tell me about yourself", genericLab).inScope).toBe(true);
  });

  it("still scopes weather questions to a weather-data lab", () => {
    const verdict = checkLabScope("What is the weather today?", {
      labTitle: "Weather data analysis",
      fileNames: ["weather.md"],
      headings: ["Weather dataset"],
      stepTitles: ["Load data"]
    });
    expect(verdict.inScope).toBe(true);
  });
});

describe("manual upload extensions", () => {
  it("accepts .md files (TEST F)", () => {
    expect(isSupportedExtension("README.md")).toBe(true);
    const sources = normalizeSources([{ path: "README.md", content: "# Title\nBody text here." }], { extensions: ["md", "txt"] });
    expect(sources).toHaveLength(1);
  });

  it("accepts .txt files (TEST G)", () => {
    expect(isSupportedExtension("notes.txt")).toBe(true);
    const sources = normalizeSources([{ path: "notes.txt", content: "Plain lab notes here." }], { extensions: ["md", "mdx", "txt"] });
    expect(sources).toHaveLength(1);
    expect(sources[0].type).toBe("markdown");
  });

  it("accepts manual .mdx files (TEST B)", () => {
    expect(isSupportedExtension("guide.mdx")).toBe(true);
    const sources = normalizeSources([{ path: "guide.mdx", content: "# Guide\nBody text here." }], { extensions: ["md", "mdx", "txt"] });
    expect(sources).toHaveLength(1);
    expect(sources[0].type).toBe("mdx");
  });

  it("rejects .pdf and other formats (TEST H)", () => {
    expect(isSupportedExtension("doc.pdf")).toBe(false);
    expect(isSupportedExtension("main.py")).toBe(false);
    expect(isSupportedExtension("image.png")).toBe(false);
    expect(() => normalizeSources([{ path: "doc.pdf", content: "x".repeat(20) }], { extensions: ["md", "mdx", "txt"] })).toThrow();
    expect(MANUAL_UPLOAD_ERROR).toBe("Only .md, .mdx, and .txt files are supported for external uploads.");
  });

  it("accepts uppercase extensions (TEST I)", () => {
    expect(isSupportedExtension("README.MD")).toBe(true);
    expect(isSupportedExtension("lab.TXT")).toBe(true);
  });

  it("accepts uppercase .mdx/.txt manual files (TEST E)", () => {
    expect(isSupportedExtension("GUIDE.MDX")).toBe(true);
    expect(isSupportedExtension("NOTES.TXT")).toBe(true);
  });

  it("accepts valid files while reporting rejected ones (TEST J)", () => {
    const result = partitionFilenames(["README.md", "image.png", "notes.txt"]);
    expect(result.accepted).toEqual(["README.md", "notes.txt"]);
    expect(result.rejected).toEqual(["image.png"]);
  });

  it("accepts mixed manual upload with .mdx (TEST F)", () => {
    const result = partitionFilenames(["README.md", "notes.mdx", "image.png"]);
    expect(result.accepted).toEqual(["README.md", "notes.mdx"]);
    expect(result.rejected).toEqual(["image.png"]);
  });

  it("keeps repository ingestion on .md/.mdx/.txt (TEST G)", () => {
    const sources = normalizeSources([{ path: "guide.mdx", content: "# Guide\nBody text here." }]);
    expect(sources).toHaveLength(1);
    expect(sources[0].type).toBe("mdx");
    const textSources = normalizeSources([{ path: "notes.txt", content: "Plain text here ok." }]);
    expect(textSources).toHaveLength(1);
    expect(textSources[0].type).toBe("markdown");
    expect(() => normalizeSources([{ path: "main.py", content: "print(1) here ok." }])).toThrow();
  });

  it("distinguishes repository vs manual sources without blocking repo files (TEST H)", () => {
    const repoSource: SourceDocument = { id: "s1", name: "example.py", path: "src/example.py", content: "print(1)", type: "markdown", headings: [], repository: "https://github.com/org/repo" };
    const manualSource: SourceDocument = { id: "s2", name: "notes.md", path: "notes.md", content: "Notes body here.", type: "markdown", headings: [] };
    expect(getSourceOrigin(repoSource)).toBe("repository");
    expect(getSourceOrigin(manualSource)).toBe("manual");
    // The manual allowlist never governs repository-owned files.
    expect(isSupportedExtension(repoSource.path)).toBe(false);
    expect(getSourceOrigin({ repository: null })).toBe("manual");
  });

  it("scopes manual sources to their repo session (TEST I)", () => {
    const manual: SourceDocument = { id: "s2", name: "notes.md", path: "notes.md", content: "Notes body here.", type: "markdown", headings: [] };
    const keyA = progressStorageKey([manual], "https://github.com/org/repo-a");
    const keyB = progressStorageKey([manual], "https://github.com/org/repo-b");
    const keyLocal = progressStorageKey([manual]);
    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyLocal);
  });
});
