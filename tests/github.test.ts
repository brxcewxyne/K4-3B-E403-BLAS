import { describe, expect, it } from "vitest";
import { parseGitHubRepositoryUrl } from "@/lib/ingest/github";

describe("parseGitHubRepositoryUrl", () => {
  it("normalizes a public repository URL", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/openai/openai-node.git")).toEqual({ owner: "openai", repo: "openai-node", repositoryUrl: "https://github.com/openai/openai-node" });
  });
  it("rejects non-GitHub and nested URLs", () => {
    expect(() => parseGitHubRepositoryUrl("https://example.com/a/b")).toThrow();
    expect(() => parseGitHubRepositoryUrl("https://github.com/a/b/tree/main")).toThrow();
  });
});
