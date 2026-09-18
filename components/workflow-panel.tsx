"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "./icons";
import type { LabProgress, LabWorkflow } from "@/lib/shared/types";

type Props = {
  workflow: LabWorkflow | null;
  progress: LabProgress;
  selectedId: string;
  loading: boolean;
  error: string;
  hasSources: boolean;
  onSelect: (id: string) => void;
  onSetCurrent: (id: string) => void;
  onComplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

export function WorkflowPanel({ workflow, progress, selectedId, loading, error, hasSources, onSelect, onSetCurrent, onComplete, onPrevious, onNext, onRetry }: Props) {
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

  const currentIndex = workflow.steps.findIndex((step) => step.id === progress.currentStepId);
  const current = workflow.steps[currentIndex] || workflow.steps[0];
  const selected = workflow.steps.find((step) => step.id === selectedId) || current || workflow.steps[0];
  const currentDone = current ? progress.completedStepIds.includes(current.id) : false;
  const navigation = (drawer = false) => <div className={`workflow-navigation ${drawer ? "drawer-navigation" : ""}`}>
    <button type="button" onClick={onPrevious} disabled={currentIndex <= 0}>Previous</button>
    <button type="button" className="mark-complete" onClick={onComplete} disabled={!current || currentDone}>{currentDone ? "Completed" : "Mark complete"}</button>
    <button type="button" onClick={onNext} disabled={currentIndex < 0 || currentIndex >= workflow.steps.length - 1}>Next</button>
  </div>;

  const drawer = open && mounted ? createPortal(
    <div className="workflow-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="workflow-drawer" role="dialog" aria-modal="true" aria-labelledby="workflow-drawer-title" data-lenis-prevent>
        <header><div><span className="kicker">Full workflow</span><h2 id="workflow-drawer-title">{workflow.title}</h2><p>{workflow.goal}</p></div><button ref={closeRef} type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close workflow"><CloseIcon /></button></header>
        <div className="workflow-list">{workflow.steps.map((step) => {
          const done = progress.completedStepIds.includes(step.id);
          const active = current?.id === step.id;
          return <button type="button" key={step.id} className={`workflow-row ${done ? "done" : ""} ${active ? "active" : ""} ${selected?.id === step.id ? "inspected" : ""}`} onClick={() => onSelect(step.id)}><span className="step-marker">{done ? <CheckIcon size={12} /> : step.order}</span><span><small>{active ? "Current" : done ? "Completed" : `Step ${step.order}`}</small><strong>{step.title}</strong></span></button>;
        })}</div>
        {selected ? <section className="step-detail"><div><span>{selected.id === current?.id ? "Current step" : progress.completedStepIds.includes(selected.id) ? "Completed" : "Step details"}</span><i>{String(selected.order).padStart(2, "0")}</i></div><h3>{selected.title}</h3><p>{selected.description}</p><h4>Required actions</h4><ul>{selected.requiredActions.map((action) => <li key={action}>— {action}</li>)}</ul><h4>Success criteria</h4><ul className="criteria">{selected.successCriteria.map((item) => <li key={item}><CheckIcon size={12} />{item}</li>)}</ul>{selected.sources.length ? <div className="step-sources"><span>Sources</span><p>{selected.sources.map((source) => source.file).join(" · ")}</p></div> : null}{selected.id !== current?.id ? <button type="button" className="set-current-button" onClick={() => onSetCurrent(selected.id)}>Set as current</button> : null}</section> : null}
        {navigation(true)}
      </aside>
    </div>, document.body
  ) : null;

  return <><aside className="floating-panel workflow-card"><span className="kicker">Current step · {current?.order || 0} / {workflow.steps.length}</span><h2>{current?.title || "No workflow steps"}</h2>{current ? <div><span>{currentDone ? "Revisiting completed step" : "Current focus"}</span><p>{current.requiredActions[0] || current.description}</p></div> : null}{navigation()}<button type="button" className="view-workflow" onClick={() => setOpen(true)}>View workflow <span>→</span></button></aside>{drawer}</>;
}
