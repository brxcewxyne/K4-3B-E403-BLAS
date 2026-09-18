export const WORKFLOW_TOGGLE_STORAGE_KEY = "workflow-toggle-position";
export const WORKFLOW_TOGGLE_DRAG_THRESHOLD_PX = 6;
export const WORKFLOW_TOGGLE_SAFE_MARGIN_PX = 8;
export const WORKFLOW_TOGGLE_DESKTOP_QUERY = "(min-width: 1051px)";

export type TogglePosition = { x: number; y: number };

/** Movement beyond the threshold counts as a drag; anything less is a click/tap. */
export function didExceedDragThreshold(dx: number, dy: number, threshold = WORKFLOW_TOGGLE_DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) > threshold;
}

/** Decide the pointer-up outcome: a non-drag release opens, a drag does nothing. */
export function resolvePointerUp(moved: boolean): "open" | "nothing" {
  return moved ? "nothing" : "open";
}

/** Clamp viewport-relative coordinates so the control always stays visible. */
export function clampTogglePosition(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  controlWidth: number,
  controlHeight: number,
  margin = WORKFLOW_TOGGLE_SAFE_MARGIN_PX
): TogglePosition {
  const maxX = Math.max(margin, viewportWidth - controlWidth - margin);
  const maxY = Math.max(margin, viewportHeight - controlHeight - margin);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY)
  };
}

/** Stored positions must be finite coordinates; anything else falls back to default. */
export function parseStoredTogglePosition(value: unknown): TogglePosition | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.x !== "number" || typeof record.y !== "number") return null;
  if (!Number.isFinite(record.x) || !Number.isFinite(record.y)) return null;
  return { x: record.x, y: record.y };
}
