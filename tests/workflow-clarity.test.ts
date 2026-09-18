import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/shared/api";
import { mapWorkflowErrorCode } from "@/lib/workflow/error-codes";
import { normalizeWorkflowStep } from "@/lib/workflow/normalize";
import { canMarkComplete, detailHeaderKind, rowLabel, rowLabelText, visibleStepSections } from "@/lib/workflow/step-view";
import type { WorkflowStep } from "@/lib/shared/types";

function step(overrides: Partial<WorkflowStep> = {}): WorkflowStep {
  return {
    id: "step-2",
    order: 2,
    title: "Configure API key",
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

describe("current vs selected step states", () => {
  it("keeps CURRENT and VIEWING distinct when they differ (TEST 1)", () => {
    expect(rowLabel({ isCurrent: false, isSelected: true, isDone: false, order: 2 })).toBe("VIEWING");
    expect(rowLabelText({ isCurrent: false, isSelected: true, isDone: false, order: 2 })).toBe("Viewing");
    expect(detailHeaderKind(false, 2)).toBe("Viewing step 2");
  });

  it("shows only CURRENT when selected is the current step (TEST 2)", () => {
    expect(rowLabel({ isCurrent: true, isSelected: true, isDone: false, order: 2 })).toBe("CURRENT");
    expect(rowLabelText({ isCurrent: true, isSelected: true, isDone: false, order: 2 })).toBe("Current");
    expect(detailHeaderKind(true, 2)).toBe("Current step");
    expect(rowLabel({ isCurrent: false, isSelected: false, isDone: true, order: 1 })).toBe("COMPLETED");
    expect(rowLabelText({ isCurrent: false, isSelected: false, isDone: false, order: 3 })).toBe("Step 3");
  });

  it("restricts Mark Complete to the actual current step", () => {
    expect(canMarkComplete(true, false, true)).toBe(true);
    expect(canMarkComplete(false, false, true)).toBe(false);
    expect(canMarkComplete(true, true, true)).toBe(false);
    expect(canMarkComplete(true, false, false)).toBe(false);
  });
});

describe("workflow field dedupe", () => {
  it("does not render identical text twice across fields (TEST 3)", () => {
    const normalized = normalizeWorkflowStep({
      title: "Install environment",
      goal: "Install environment!",
      whatToDo: ["Run the installer", "Run the installer"],
      howToDoIt: ["run the installer"],
      expectedOutput: ["Working installation"],
      successCriteria: ["working installation", "Installer exits cleanly"]
    }, 0);
    expect(normalized.title).toBe("Install environment");
    expect(normalized.goal).toBe("");
    expect(normalized.whatToDo).toEqual(["Run the installer"]);
    expect(normalized.howToDoIt).toEqual([]);
    expect(normalized.expectedOutput).toEqual(["Working installation"]);
    expect(normalized.successCriteria).toEqual(["Installer exits cleanly"]);
  });

  it("hides empty sections instead of rendering placeholders (TEST 4)", () => {
    expect(visibleStepSections(step())).toEqual([]);
    const full = step({
      goal: "Why",
      requirements: ["Req"],
      whatToDo: ["Do"],
      howToDoIt: ["How"],
      expectedOutput: ["Out"],
      successCriteria: ["Done"],
      warnings: ["Careful"],
      sources: [{ sourceId: "a", file: "a.md", section: "S", excerpt: "E" }]
    });
    expect(visibleStepSections(full)).toEqual([
      "goal", "requirements", "whatToDo", "howToDoIt", "expectedOutput", "successCriteria", "warnings", "sources"
    ]);
  });
});

describe("workflow error taxonomy", () => {
  it("maps failures to clean error codes (TEST 7)", () => {
    expect(mapWorkflowErrorCode(new AppError("AI_TIMEOUT", "slow", 504))).toBe("AI_TIMEOUT");
    expect(mapWorkflowErrorCode(new AppError("AI_MALFORMED_RESPONSE", "bad json", 502))).toBe("WORKFLOW_PARSE_ERROR");
    expect(mapWorkflowErrorCode(new AppError("AI_AUTH_ERROR", "denied", 503))).toBe("AI_AUTH_ERROR");
    expect(mapWorkflowErrorCode(new AppError("AI_APPLICATION_TIMEOUT", "aborted", 504))).toBe("AI_APPLICATION_TIMEOUT");
    expect(mapWorkflowErrorCode(new Error("boom"))).toBe("UNKNOWN");
  });
});
