import { describe, expect, it } from "vitest";
import {
  clampTogglePosition,
  didExceedDragThreshold,
  parseStoredTogglePosition,
  resolvePointerUp,
  WORKFLOW_TOGGLE_DRAG_THRESHOLD_PX,
  WORKFLOW_TOGGLE_STORAGE_KEY
} from "@/lib/workflow/toggle-drag";

describe("workflow toggle drag helpers", () => {
  it("falls back to the default position without valid stored coordinates (TEST A)", () => {
    expect(parseStoredTogglePosition(null)).toBeNull();
    expect(parseStoredTogglePosition("oops")).toBeNull();
    expect(parseStoredTogglePosition({ x: Number.NaN, y: 10 })).toBeNull();
    expect(parseStoredTogglePosition({ x: 10 })).toBeNull();
    expect(parseStoredTogglePosition({ x: 200, y: 300 })).toEqual({ x: 200, y: 300 });
    expect(WORKFLOW_TOGGLE_STORAGE_KEY).toBe("workflow-toggle-position");
    expect(WORKFLOW_TOGGLE_DRAG_THRESHOLD_PX).toBeGreaterThanOrEqual(4);
  });

  it("distinguishes small taps from real drags (TEST B)", () => {
    expect(didExceedDragThreshold(0, 0)).toBe(false);
    expect(didExceedDragThreshold(3, 3)).toBe(false);
    expect(didExceedDragThreshold(6, 0)).toBe(false);
    expect(didExceedDragThreshold(5, 5)).toBe(true);
    expect(didExceedDragThreshold(0, 40)).toBe(true);
  });

  it("never opens the panel when a drag ends (TEST C)", () => {
    expect(resolvePointerUp(true)).toBe("nothing");
  });

  it("opens the panel on a plain click/tap (TEST D)", () => {
    expect(resolvePointerUp(false)).toBe("open");
  });

  it("keeps valid positions as-is so close/reopen preserves placement (TEST F)", () => {
    expect(clampTogglePosition(200, 300, 1280, 800, 140, 42)).toEqual({ x: 200, y: 300 });
  });

  it("clamps stray coordinates back inside the viewport (TEST G)", () => {
    expect(clampTogglePosition(-50, 2000, 1280, 800, 140, 42)).toEqual({ x: 8, y: 750 });
    expect(clampTogglePosition(5000, 5000, 1280, 800, 140, 42)).toEqual({ x: 1132, y: 750 });
    expect(clampTogglePosition(0, 0, 100, 100, 140, 42)).toEqual({ x: 8, y: 8 });
  });
});
