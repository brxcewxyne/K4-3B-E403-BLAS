"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "./icons";
import type { LabWorkflow } from "@/lib/shared/types";

type Props = {
  workflow: LabWorkflow | null;
  completed: string[];
  selectedId: string;
  loading: boolean;
  error: string;
  hasSources: boolean;
  onSelect: (id: string) => void;
  onComplete: () => void;
  onRetry: () => void;
};

export function WorkflowPanel({ workflow, completed, selectedId, loading, error, hasSources, onSelect, onComplete, onRetry }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  if (loading) return <aside className="floating-panel workflow-card"><div className="workflow-status"><div className="state-spinner" /><div><span>Workflow</span><strong>Generating checklist…</strong><p>Chat is ready while this runs.</p></div></div></aside>;
  if (error) return <aside className="floating-panel workflow-card workflow-unavailable"><span>Workflow unavailable</span><strong>{/timed out|too long/i.test(error) ? "Generation timed out." : "Generation failed."}</strong><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></aside>;
  if (!workflow) return hasSources ? null : <aside className="floating-panel workflow-card workflow-placeholder"><span>Workflow</span><strong>Add materials to begin</strong></aside>;

  const current = workflow.steps.find((step) => !completed.includes(step.id));
  const selected = workflow.steps.find((step) => step.id === selectedId) || current || workflow.steps[0];
  const drawer = open && mounted ? createPortal(
    <div className="workflow-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="workflow-drawer" role="dialog" aria-modal="true" aria-labelledby="workflow-drawer-title" data-lenis-prevent>
        <header><div><span className="kicker">Full workflow</span><h2 id="workflow-drawer-title">{workflow.title}</h2><p>{workflow.goal}</p></div><button ref={closeRef} type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close workflow"><CloseIcon /></button></header>
        <div className="workflow-list">{workflow.steps.map((step) => {
          const done = completed.includes(step.id);
          const active = current?.id === step.id;
          return <button type="button" key={step.id} className={`workflow-row ${done ? "done" : ""} ${active ? "active" : ""} ${selected?.id === step.id ? "inspected" : ""}`} onClick={() => onSelect(step.id)}><span className="step-marker">{done ? <CheckIcon size={12} /> : step.order}</span><span><small>{done ? "Completed" : active ? "Current" : `Step ${step.order}`}</small><strong>{step.title}</strong></span></button>;
        })}</div>
        {selected ? <section className="step-detail"><div><span>{selected.id === current?.id ? "Current step" : completed.includes(selected.id) ? "Completed" : "Step details"}</span><i>{String(selected.order).padStart(2, "0")}</i></div><h3>{selected.title}</h3><p>{selected.description}</p><h4>Required actions</h4><ul>{selected.requiredActions.map((action) => <li key={action}>— {action}</li>)}</ul><h4>Success criteria</h4><ul className="criteria">{selected.successCriteria.map((item) => <li key={item}><CheckIcon size={12} />{item}</li>)}</ul>{selected.sources.length ? <div className="step-sources"><span>Sources</span><p>{selected.sources.map((source) => source.file).join(" · ")}</p></div> : null}</section> : null}
        <button type="button" className="complete-button" onClick={onComplete} disabled={!current}><span>{current ? "Mark current step complete" : "Lab completed"}</span><i>→</i></button>
      </aside>
    </div>, document.body
  ) : null;

  return <><aside className="floating-panel workflow-card"><span className="kicker">Current step</span><h2>{current?.title || "Workflow complete"}</h2>{current ? <div><span>Next</span><p>{current.requiredActions[0] || current.description}</p></div> : <p>Every workflow step is complete.</p>}<button type="button" className="view-workflow" onClick={() => setOpen(true)}>View workflow <span>→</span></button></aside>{drawer}</>;
}
