import { describe, expect, it } from "vitest";
import { buildLocalFallbackWorkflow } from "@/lib/workflow/fallback";
import {
  extractGoalFromSources,
  humanizeSlugLike,
  isTechnicalIdentifier,
  NEUTRAL_GOAL,
  resolveWorkflowGoal,
  resolveWorkflowTitle
} from "@/lib/workflow/goal";
import type { SourceDocument } from "@/lib/shared/types";

function doc(path: string, content: string, index: number, repository?: string): SourceDocument {
  return {
    id: `source-${index}`,
    name: path.split("/").pop() || path,
    path,
    content,
    type: "markdown",
    headings: [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1]),
    ...(repository ? { repository } : {})
  };
}

describe("technical identifier guard", () => {
  it("flags slugs, paths, URLs and filenames", () => {
    expect(isTechnicalIdentifier("brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling")).toBe(true);
    expect(isTechnicalIdentifier("owner/repo-name")).toBe(true);
    expect(isTechnicalIdentifier("https://github.com/owner/repo")).toBe(true);
    expect(isTechnicalIdentifier("README.md")).toBe(true);
    expect(isTechnicalIdentifier("docs/setup.md")).toBe(true);
    expect(isTechnicalIdentifier("day04-prompt-tool-calling")).toBe(true);
    expect(isTechnicalIdentifier("")).toBe(true);
  });

  it("accepts human prose and the neutral fallback", () => {
    expect(isTechnicalIdentifier("Lab 4 — Prompt Engineering & Tool Calling")).toBe(false);
    expect(isTechnicalIdentifier("Understand prompt behavior and tool calling.")).toBe(false);
    expect(isTechnicalIdentifier(NEUTRAL_GOAL)).toBe(false);
    expect(isTechnicalIdentifier("Lab Workflow")).toBe(false);
  });

  it("humanizes slugs for title-only use", () => {
    const humanized = humanizeSlugLike("brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling");
    expect(humanized).not.toContain("/");
    expect(humanized).toMatch(/prompt engineering/i);
    expect(isTechnicalIdentifier(humanized)).toBe(false);
  });
});

describe("goal extraction", () => {
  it("reads Goal sections first (TEST A)", () => {
    const sources = [doc("README.md", "# Lab 4 — Prompt Engineering & Tool Calling\n\n## Goal\nUnderstand prompt behavior and tool calling.", 0)];
    expect(resolveWorkflowTitle({ parsedTitle: "", sources })).toBe("Lab 4 — Prompt Engineering & Tool Calling");
    expect(resolveWorkflowGoal({ parsedGoal: "", sources })).toBe("Understand prompt behavior and tool calling.");
  });

  it("never returns the repo slug as goal (TEST B)", () => {
    const sources = [
      doc("README.md", "# Lab\n\n## Setup\n\nRun python main.py to start the agent loop.", 0, "https://github.com/owner/day04-prompt-tool-calling")
    ];
    const goal = resolveWorkflowGoal({ parsedGoal: "", sources });
    expect(goal).not.toBe("owner/day04-prompt-tool-calling");
    expect(isTechnicalIdentifier(goal)).toBe(false);
    expect(goal.length).toBeGreaterThan(0);
  });

  it("falls back to a humanized title but a safe goal (TEST C)", () => {
    const sources = [doc("notes.md", "Just some unstructured notes without headings.", 0)];
    const title = resolveWorkflowTitle({ labTitle: "owner/day04-x", sources });
    const goal = resolveWorkflowGoal({ sources });
    expect(title).not.toContain("/");
    expect(isTechnicalIdentifier(goal)).toBe(false);
  });

  it("rejects a slug goal from model output (TEST D)", () => {
    const sources = [doc("README.md", "# Lab\n\n## Overview\n\nCourse lab about agents.", 0)];
    const goal = resolveWorkflowGoal({ parsedGoal: "owner/repo-name", sources });
    expect(goal).not.toBe("owner/repo-name");
    expect(isTechnicalIdentifier(goal)).toBe(false);
  });

  it("rejects a filename goal (TEST E)", () => {
    const sources = [doc("README.md", "# Lab\n\n## Overview\n\nCourse lab about agents.", 0)];
    expect(resolveWorkflowGoal({ parsedGoal: "README.md", sources })).not.toBe("README.md");
  });

  it("combines multiple objective lines and prefers valid parsed goals", () => {
    const sources = [doc("README.md", "# Lab\n\n## Objectives\n- Understand prompts\n- Test tool calling", 0)];
    expect(extractGoalFromSources(sources)).toContain("Understand prompts");
    expect(resolveWorkflowGoal({ parsedGoal: "Custom valid objective here", sources })).toBe("Custom valid objective here");
    expect(resolveWorkflowGoal({ sources })).not.toBe("");
  });
});

describe("fallback title and goal", () => {
  it("never emits the repo slug as goal", () => {
    const workflow = buildLocalFallbackWorkflow(
      [doc("README.md", "# Lab\n\n## Setup\n\n- Install dependencies.", 0, "https://github.com/brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling")],
      "brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling"
    );
    expect(workflow.goal).not.toBe("brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling");
    expect(isTechnicalIdentifier(workflow.goal)).toBe(false);
    expect(workflow.title).not.toBe("brxcewxyne/day04-cohorts34-prompt-engineering-tool-calling");
  });
});
