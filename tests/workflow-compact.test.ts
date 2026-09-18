import { afterEach, describe, expect, it } from "vitest";
import { prepareWorkflowContext, resolveWorkflowContextBudget, WORKFLOW_CONTEXT_CHAR_BUDGET } from "@/lib/workflow/context";
import type { SourceDocument } from "@/lib/shared/types";

function doc(name: string, content: string, index: number): SourceDocument {
  return {
    id: `source-${index}`,
    name: name.split("/").pop() || name,
    path: name,
    content,
    type: "markdown",
    headings: [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1])
  };
}

describe("compact workflow context", () => {
  afterEach(() => {
    delete process.env.AI_WORKFLOW_CONTEXT_MAX_CHARS;
  });

  it("indexes every file even when excerpts are budgeted", () => {
    const sources = [
      doc("README.md", "# Overview\n\nLab overview text here.", 0),
      doc("docs/setup.md", "# Setup\n\nInstall everything first.", 1),
      doc("docs/lab/step.md", "# Step\n\nDo the thing.", 2)
    ];
    const context = prepareWorkflowContext(sources);
    expect(context.payload).toContain("SOURCE INDEX (3/3 files");
    expect(context.payload).toContain("docs/setup.md");
    expect(context.inputSourceCount).toBe(3);
  });

  it("caps payload characters at the default budget", () => {
    expect(WORKFLOW_CONTEXT_CHAR_BUDGET).toBe(24_000);
    const sources = Array.from({ length: 6 }, (_, index) =>
      doc(`guide-${index}.md`, `# Guide ${index}\n\n${"Content sentence here. ".repeat(400)}`, index)
    );
    const context = prepareWorkflowContext(sources);
    expect(context.characters).toBeLessThanOrEqual(WORKFLOW_CONTEXT_CHAR_BUDGET);
    expect(context.inputSourceCount).toBe(6);
  });

  it("honors AI_WORKFLOW_CONTEXT_MAX_CHARS when configured", () => {
    process.env.AI_WORKFLOW_CONTEXT_MAX_CHARS = "8000";
    expect(resolveWorkflowContextBudget()).toBe(8000);
    const sources = Array.from({ length: 4 }, (_, index) =>
      doc(`guide-${index}.md`, `# Guide ${index}\n\n${"Content sentence here. ".repeat(400)}`, index)
    );
    const context = prepareWorkflowContext(sources);
    expect(context.characters).toBeLessThanOrEqual(8000);
  });

  it("ignores invalid budget configuration", () => {
    process.env.AI_WORKFLOW_CONTEXT_MAX_CHARS = "tiny";
    expect(resolveWorkflowContextBudget()).toBe(WORKFLOW_CONTEXT_CHAR_BUDGET);
  });
});
