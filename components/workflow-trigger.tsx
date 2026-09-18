"use client";

import { useEffect, useRef, useState } from "react";
import {
  clampTogglePosition,
  didExceedDragThreshold,
  parseStoredTogglePosition,
  resolvePointerUp,
  WORKFLOW_TOGGLE_DESKTOP_QUERY,
  WORKFLOW_TOGGLE_STORAGE_KEY,
  type TogglePosition
} from "@/lib/workflow/toggle-drag";

type Props = {
  open: boolean;
  completed: number;
  total: number;
  onOpen: () => void;
};

function readStoredPosition(): TogglePosition | null {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_TOGGLE_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredTogglePosition(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Draggable closed-state Workflow toggle. Viewport-relative (position: fixed);
 * dragging never affects where the full panel opens. Hidden (not unmounted)
 * while the panel is open so the last dragged position survives open/close.
 */
export function WorkflowTrigger({ open, completed, total, onOpen }: Props) {
  const [position, setPosition] = useState<TogglePosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    setPosition((current) => {
      if (current) return current;
      const stored = readStoredPosition();
      if (!stored) return current;
      return clampTogglePosition(stored.x, stored.y, window.innerWidth, window.innerHeight, buttonRef.current?.offsetWidth || 140, buttonRef.current?.offsetHeight || 42);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia(WORKFLOW_TOGGLE_DESKTOP_QUERY);
    const update = () => setDesktop(media.matches);
    update();
    const reclamp = () => {
      setPosition((current) => {
        if (!current) return current;
        return clampTogglePosition(current.x, current.y, window.innerWidth, window.innerHeight, buttonRef.current?.offsetWidth || 140, buttonRef.current?.offsetHeight || 42);
      });
    };
    media.addEventListener("change", update);
    window.addEventListener("resize", reclamp);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", reclamp);
    };
  }, []);

  function measure() {
    return {
      width: buttonRef.current?.offsetWidth || 140,
      height: buttonRef.current?.offsetHeight || 42
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!desktop || open) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const { width, height } = measure();
    const origin = position || { x: window.innerWidth - width - 18, y: window.innerHeight / 2 - height / 2 };
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
    buttonRef.current?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!active.moved && !didExceedDragThreshold(dx, dy)) return;
    active.moved = true;
    setDragging(true);
    const { width, height } = measure();
    setPosition(clampTogglePosition(active.originX + dx, active.originY + dy, window.innerWidth, window.innerHeight, width, height));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (resolvePointerUp(active.moved) === "nothing") {
      suppressClick.current = true;
      const { width, height } = measure();
      const finalPosition = clampTogglePosition(
        active.originX + (event.clientX - active.startX),
        active.originY + (event.clientY - active.startY),
        window.innerWidth,
        window.innerHeight,
        width,
        height
      );
      setPosition(finalPosition);
      try {
        window.localStorage.setItem(WORKFLOW_TOGGLE_STORAGE_KEY, JSON.stringify(finalPosition));
      } catch {
        // Persistence is best-effort; the toggle works without it.
      }
    }
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      return;
    }
    onOpen();
  }

  // Persisted position takes effect on desktop only; mobile keeps its default placement.
  const customPosition = desktop && position ? position : null;

  return (
    <button
      ref={buttonRef}
      type="button"
      hidden={open}
      className={`workflow-trigger${customPosition ? " custom-pos" : ""}${dragging ? " dragging" : ""}`}
      style={customPosition ? { left: customPosition.x, top: customPosition.y } : undefined}
      aria-label="Open workflow panel"
      aria-expanded={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}
      onClick={handleClick}
    >
      <span className="workflow-trigger-dot" aria-hidden="true" />
      Workflow
      {total ? <em>{completed}/{total}</em> : null}
      <span aria-hidden="true">→</span>
    </button>
  );
}
