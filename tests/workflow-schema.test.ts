import { describe, expect, it } from "vitest";
import { labWorkflowSchema } from "@/lib/shared/schemas";

describe("workflow schema", () => {
  it("accepts a grounded workflow", () => {
    const result = labWorkflowSchema.safeParse({ title: "Lab", goal: "Finish lab", prerequisites: [], steps: [{ id: "step-1", order: 1, title: "Start", description: "Begin", requiredActions: ["Read README"], successCriteria: ["README read"], hints: [], sources: [{ sourceId: "readme-1", file: "README.md", section: "Start", excerpt: "Read README" }] }], checkpoints: [], conflicts: [] });
    expect(result.success).toBe(true);
  });
  it("rejects a workflow without steps", () => {
    expect(labWorkflowSchema.safeParse({ title: "Lab", goal: "Finish", prerequisites: [], steps: [], checkpoints: [], conflicts: [] }).success).toBe(false);
  });
});
