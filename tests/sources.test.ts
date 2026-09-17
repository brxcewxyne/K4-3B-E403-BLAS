import { describe, expect, it } from "vitest";
import { chunkSources, rankChunks } from "@/lib/sources/chunks";
import { normalizeSources } from "@/lib/sources/normalize";

describe("source processing", () => {
  const sources = normalizeSources([{ path: "docs/setup.md", content: "# Setup\nInstall dependencies.\n\n## Run project\nUse `npm run dev`." }, { path: "README.mdx", content: "# Goal\nBuild the lab agent." }]);
  it("normalizes Markdown and extracts headings", () => {
    expect(sources).toHaveLength(2);
    expect(sources[0].headings).toEqual(["Setup", "Run project"]);
    expect(sources[1].type).toBe("mdx");
  });
  it("chunks by heading and ranks relevant content", () => {
    const ranked = rankChunks(chunkSources(sources), "How do I run the project?", 2);
    expect(ranked[0].section).toBe("Run project");
    expect(ranked[0].content).toContain("npm run dev");
  });
});
