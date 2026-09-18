import { describe, expect, it } from "vitest";
import { completeAndAdvance, createChatWorkflowContext, initialProgress, moveToStep, normalizeProgress, progressStorageKey } from "../lib/workflow/progress";
import type { LabWorkflow, SourceDocument } from "../lib/shared/types";

const workflow: LabWorkflow = {
  title: "Lab",
  goal: "Finish the lab",
  prerequisites: [],
  checkpoints: [],
  conflicts: [],
  steps: ["Read", "Configure", "Run"].map((title, index) => ({
    id: `step-${index + 1}`,
    order: index + 1,
    title,
    goal: `${title} goal`,
    requirements: [],
    whatToDo: [`${title} action`],
    howToDoIt: [],
    expectedOutput: [`${title} output`],
    successCriteria: [`${title} done`],
    warnings: [],
    description: `${title} description`,
    requiredActions: [`${title} action`],
    hints: [],
    sources: []
  }))
};

const source: SourceDocument = { id: "source-1", name: "README.md", path: "README.md", content: "Lab instructions", type: "markdown", headings: [] };

describe("lab progress", () => {
  it("starts with an explicit current step and advances only when completed", () => {
    const initial = initialProgress(workflow);
    expect(initial).toMatchObject({ currentStepId: "step-1", completedStepIds: [] });
    const advanced = completeAndAdvance(workflow, initial);
    expect(advanced).toMatchObject({ currentStepId: "step-2", completedStepIds: ["step-1"] });
  });

  it("moves backward or forward without changing completion", () => {
    const progress = { currentStepId: "step-2", completedStepIds: ["step-1"], stepHistory: ["step-1", "step-2"] };
    const revisited = moveToStep(progress, "step-1");
    expect(revisited.currentStepId).toBe("step-1");
    expect(revisited.completedStepIds).toEqual(["step-1"]);
    expect(moveToStep(revisited, "step-2").completedStepIds).toEqual(["step-1"]);
  });

  it("normalizes saved progress and builds compact AI context", () => {
    const progress = normalizeProgress(workflow, { currentStepId: "step-2", completedStepIds: ["step-1", "missing"] });
    const context = createChatWorkflowContext(workflow, progress);
    expect(context.currentStep?.title).toBe("Configure");
    expect(context.previousStep?.title).toBe("Read");
    expect(context.nextStep?.title).toBe("Run");
    expect(context.completedSteps.map((step) => step.id)).toEqual(["step-1"]);
  });

  it("isolates progress keys by repository and uploaded content", () => {
    expect(progressStorageKey([source], "https://github.com/org/one")).not.toBe(progressStorageKey([source], "https://github.com/org/two"));
    expect(progressStorageKey([source])).not.toBe(progressStorageKey([{ ...source, content: "Different lab" }]));
  });
});
