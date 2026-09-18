import { describe, expect, it } from "vitest";
import { normalizeWorkflowStep } from "@/lib/workflow/normalize";
import { labWorkflowSchema } from "@/lib/shared/schemas";
import type { WorkflowStep } from "@/lib/shared/types";

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    id: "step-1",
    order: 1,
    title: "Run baseline",
    goal: "",
    requirements: [],
    whatToDo: [],
    howToDoIt: [],
    expectedOutput: [],
    successCriteria: [],
    warnings: [],
    sources: [],
    ...overrides
  };
}

describe("synthesis-first workflow shape", () => {
  it("accepts a complete synthesized step", () => {
    const result = labWorkflowSchema.safeParse({
      title: "Lab",
      goal: "Finish lab",
      prerequisites: [],
      steps: [{
        id: "step-1",
        order: 1,
        title: "Run baseline",
        goal: "Validate the agent works",
        requirements: ["Dependencies installed"],
        whatToDo: ["Start the app", "Send one request"],
        howToDoIt: ["Run npm run dev"],
        expectedOutput: ["One trace"],
        successCriteria: ["App starts"],
        warnings: ["Missing env vars"],
        sources: []
      }],
      checkpoints: [],
      conflicts: []
    });
    expect(result.success).toBe(true);
  });

  it("accepts legacy steps and maps them forward without inventing content", () => {
    const parsed = labWorkflowSchema.safeParse({
      title: "Lab",
      goal: "Finish",
      prerequisites: [],
      steps: [{ id: "step-1", order: 1, title: "Start", description: "Begin here", requiredActions: ["Read README"], successCriteria: ["Done"], hints: ["Tip"], sources: [] }],
      checkpoints: [],
      conflicts: []
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const normalized = normalizeWorkflowStep(parsed.data.steps[0], 0);
    expect(normalized.goal).toBe("Begin here");
    expect(normalized.whatToDo).toEqual(["Read README"]);
    expect(normalized.howToDoIt).toEqual(["Tip"]);
    expect(normalized.requirements).toEqual([]);
    expect(normalized.expectedOutput).toEqual([]);
    expect(normalized.warnings).toEqual([]);
  });

  it("prefers synthesized fields over legacy ones and trims blanks", () => {
    const normalized = normalizeWorkflowStep(step({
      goal: "  Validate  ",
      requirements: [" Deps ", ""],
      whatToDo: ["New action"],
      requiredActions: ["Old action"],
      howToDoIt: [],
      hints: ["Old hint"]
    }), 0);
    expect(normalized.goal).toBe("Validate");
    expect(normalized.whatToDo).toEqual(["New action"]);
    expect(normalized.howToDoIt).toEqual(["Old hint"]);
    expect(normalized.requirements).toEqual(["Deps"]);
  });
});
