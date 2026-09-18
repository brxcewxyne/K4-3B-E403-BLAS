import { describe, expect, it } from "vitest";
import { countUniqueSources, groupCitationsBySource } from "@/lib/sources/group-citations";
import type { Citation } from "@/lib/shared/types";

function citation(sourceId: string, file: string, section: string, excerpt = "excerpt"): Citation {
  return { sourceId, file, section, excerpt };
}

describe("groupCitationsBySource", () => {
  it("groups sections under each file once", () => {
    const groups = groupCitationsBySource([
      citation("a", "README.md", "System Prompt"),
      citation("a", "README.md", "Tool Calling"),
      citation("b", "errors.md", "Prompt failures")
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].file).toBe("README.md");
    expect(groups[0].sections.map((section) => section.section)).toEqual(["System Prompt", "Tool Calling"]);
    expect(countUniqueSources).toBeDefined();
    expect(countUniqueSources([
      citation("a", "README.md", "System Prompt"),
      citation("a", "README.md", "Tool Calling"),
      citation("b", "errors.md", "Prompt failures")
    ])).toBe(2);
  });

  it("removes duplicate sections case-insensitively and keeps the first excerpt", () => {
    const groups = groupCitationsBySource([
      { ...citation("a", "README.md", "System Prompt", "first"), excerpt: "first" },
      { ...citation("a", "README.md", "  system prompt ", "second"), excerpt: "second" }
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sections).toHaveLength(1);
    expect(groups[0].sections[0].citation.excerpt).toBe("first");
  });

  it("keeps same-named files from different paths distinct", () => {
    const groups = groupCitationsBySource([
      citation("readme-root", "README.md", "Overview"),
      citation("readme-docs", "README.md", "Setup")
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.sourceId)).toEqual(["readme-root", "readme-docs"]);
  });

  it("supports citations without a section as file-only groups", () => {
    const groups = groupCitationsBySource([citation("a", "SELF_REVIEW.md", "")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sections).toHaveLength(1);
    expect(groups[0].sections[0].section).toBe("");
  });

  it("preserves first-appearance order", () => {
    const groups = groupCitationsBySource([
      citation("b", "errors.md", "One"),
      citation("a", "README.md", "Two"),
      citation("b", "errors.md", "Three")
    ]);
    expect(groups.map((group) => group.file)).toEqual(["errors.md", "README.md"]);
    expect(groups[0].sections.map((section) => section.section)).toEqual(["One", "Three"]);
  });
});
