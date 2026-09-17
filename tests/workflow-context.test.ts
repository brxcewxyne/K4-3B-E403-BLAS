import { describe, expect, it } from "vitest";
import { prepareWorkflowContext, WORKFLOW_CONTEXT_CHAR_BUDGET, WORKFLOW_RETRY_CHAR_BUDGET } from "@/lib/workflow/context";
import type { SourceDocument } from "@/lib/shared/types";

function source(name: string, content: string, index: number): SourceDocument {
  return { id: `source-${index}`, name, path: name, content, type: "markdown", headings: [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1]) };
}

describe("workflow context selection", () => {
  it("prioritizes instructional Markdown and respects the normal budget", () => {
    const sources = Array.from({ length: 16 }, (_, index) => source(
      index === 12 ? "README.md" : index === 13 ? "evaluation-guide.md" : `notes-${index}.md`,
      `# ${index === 12 ? "Lab Objective" : "Notes"}\n\n${"Relevant content. ".repeat(900)}`,
      index
    ));
    const context = prepareWorkflowContext(sources);

    expect(context.characters).toBeLessThanOrEqual(WORKFLOW_CONTEXT_CHAR_BUDGET);
    expect(context.chunks).toBeLessThanOrEqual(12);
    expect(context.sourceNames).toContain("README.md");
    expect(context.sourceNames).toContain("evaluation-guide.md");
  });

  it("uses a smaller priority-only context for the retry", () => {
    const longReadme = `# Setup\n\n${Array.from({ length: 520 }, (_, index) => `Evaluation requirement ${index}.`).join("\n")}`;
    const sources = [
      source("LICENSE.md", "# License\n\nLegal terms only.", 1),
      source("README.md", longReadme, 2),
      source("checkpoint.md", `# Checkpoint\n\n${"Verify the result. ".repeat(1200)}`, 3)
    ];
    const context = prepareWorkflowContext(sources, "compact");

    expect(context.characters).toBeLessThanOrEqual(WORKFLOW_RETRY_CHAR_BUDGET);
    expect(context.chunks).toBeLessThanOrEqual(6);
    expect(context.sourceNames).not.toContain("LICENSE.md");
    expect(context.payload).toContain("section=Setup");
  });
});
