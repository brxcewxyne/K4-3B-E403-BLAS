"use client";

import { useEffect } from "react";
import { CheckIcon } from "./icons";
import type { LabProgress, LabWorkflow } from "@/lib/shared/types";

type Props = {
  workflow: LabWorkflow | null;
  progress: LabProgress;
  selectedId: string;
  loading: boolean;
  error: string;
  hasSources: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onSetCurrent: (id: string) => void;
  onComplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

export function WorkflowPanel({ workflow, progress, selectedId, loading, error, hasSources, open, onOpenChange, onSelect, onSetCurrent, onComplete, onPrevious, onNext, onRetry }: Props) {
  // Escape closes. No focus trap: this is a non-modal docked panel.
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open, onOpenChange]);

  const total = workflow?.steps.length || 0;
  const completed = progress.completedStepIds.length;
  const currentIndex = workflow ? workflow.steps.findIndex((step) => step.id === progress.currentStepId) : -1;
  const current = workflow ? workflow.steps[currentIndex] || workflow.steps[0] : undefined;
  const selected = workflow ? workflow.steps.find((step) => step.id === selectedId) || current || workflow.steps[0] : undefined;
  const currentDone = current ? progress.completedStepIds.includes(current.id) : false;

  function body() {
    if (loading) return <div className="workflow-side-body"><div className="workflow-status"><div className="state-spinner" /><div><span>Workflow</span><strong>Generating checklist…</strong><p>Chat is ready while this runs.</p></div></div></div>;
    if (error) return <div className="workflow-side-body"><div className="workflow-status workflow-unavailable"><div><span>Workflow unavailable</span><strong>{/timed out|too long/i.test(error) ? "Generation timed out." : "Generation failed."}</strong><p>{error}</p><button type="button" className="set-current-button" onClick={onRetry}>Retry</button></div></div></div>;
    if (!workflow) return <div className="workflow-side-body"><div className="centered-state"><span className="kicker">Workflow</span><strong>{hasSources ? "Preparing checklist…" : "Add materials to begin"}</strong><p>{hasSources ? "Sources are indexed — the checklist appears here once generation finishes." : "Ingest a repository or Markdown files and the checklist appears here."}</p></div></div>;

    const pct = total ? Math.round((completed / total) * 100) : 0;
    return (
      <>
        <div className="workflow-side-meta">
          <div className="goal-row"><div><span>Goal</span><strong>{workflow.goal || workflow.title}</strong></div><span>{completed}/{total}</span></div>
          <div className="progress-track" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${pct}%` }} /></div>
        </div>
        {current ? (
          <section className="focus-card" aria-live="polite">
            <span>Current step · {current.order} / {total}</span>
            <h2>{current.title}</h2>
            <div><p>{currentDone ? "Completed — revisiting." : current.requiredActions[0] || current.description}</p></div>
          </section>
        ) : null}
        <div className="workflow-list" role="listbox" aria-label="Workflow steps">
          {workflow.steps.map((step) => {
            const done = progress.completedStepIds.includes(step.id);
            const active = current?.id === step.id;
            return (
              <button
                type="button"
                key={step.id}
                role="option"
                aria-selected={selected?.id === step.id}
                className={`workflow-row ${done ? "done" : ""} ${active ? "active" : ""} ${selected?.id === step.id ? "inspected" : ""}`}
                onClick={() => onSelect(step.id)}
              >
                <span className="step-marker">{done ? <CheckIcon size={12} /> : step.order}</span>
                <span><small>{active ? "Current" : done ? "Completed" : `Step ${step.order}`}</small><strong>{step.title}</strong></span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <section className="step-detail">
            <div><span>{selected.id === current?.id ? "Current step" : progress.completedStepIds.includes(selected.id) ? "Completed" : "Step details"}</span><i>{String(selected.order).padStart(2, "0")}</i></div>
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>
            <h4>Required actions</h4>
            <ul>{selected.requiredActions.map((action) => <li key={action}>— {action}</li>)}</ul>
            <h4>Success criteria</h4>
            <ul className="criteria">{selected.successCriteria.map((item) => <li key={item}><CheckIcon size={12} />{item}</li>)}</ul>
            {selected.hints?.length ? <><h4>Hints</h4><ul>{selected.hints.map((hint) => <li key={hint}>· {hint}</li>)}</ul></> : null}
            {selected.sources.length ? <div className="step-sources"><span>Sources</span><p>{selected.sources.map((source) => source.file).join(" · ")}</p></div> : null}
            {selected.id !== current?.id ? <button type="button" className="set-current-button" onClick={() => onSetCurrent(selected.id)}>Set as current</button> : null}
          </section>
        ) : null}
        {workflow.checkpoints?.length ? (
          <section className="step-detail">
            <div><span>Checkpoints</span></div>
            {workflow.checkpoints.map((checkpoint) => (
              <div key={checkpoint.title} style={{ marginTop: 8 }}>
                <h3 style={{ fontSize: 10 }}>{checkpoint.title}</h3>
                <ul>{checkpoint.requirements.map((req) => <li key={req}>— {req}</li>)}</ul>
              </div>
            ))}
          </section>
        ) : null}
        {workflow.conflicts?.length ? (
          <section className="step-detail">
            <div><span>Conflicts</span></div>
            {workflow.conflicts.map((conflict, index) => <p key={index}>{conflict.description}</p>)}
          </section>
        ) : null}
        <div className="workflow-navigation workflow-side-nav">
          <button type="button" onClick={onPrevious} disabled={currentIndex <= 0}>Previous</button>
          <button type="button" className="mark-complete" onClick={onComplete} disabled={!current || currentDone}>{currentDone ? "Completed" : "Mark complete"}</button>
          <button type="button" onClick={onNext} disabled={currentIndex < 0 || currentIndex >= workflow.steps.length - 1}>Next</button>
        </div>
      </>
    );
  }

  return (
    <div className={`workflow-side-layer ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="workflow-trigger"
        aria-expanded={open}
        aria-controls="workflow-side-panel"
        onClick={() => onOpenChange(!open)}
      >
        <span className="workflow-trigger-dot" aria-hidden="true" />
        Workflow
        {total ? <em>{completed}/{total}</em> : null}
        <span aria-hidden="true">{open ? "×" : "→"}</span>
      </button>
      <aside
        id="workflow-side-panel"
        className={`workflow-side glass-panel ${open ? "open" : ""}`}
        role="complementary"
        aria-label="Lab workflow checklist"
        aria-hidden={!open}
        data-lenis-prevent
      >
        <header className="workflow-side-head">
          <div><span className="kicker">Workflow</span><h2>{workflow?.title || "Checklist"}</h2></div>
          <button type="button" className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close workflow panel">✕</button>
        </header>
        {body()}
      </aside>
    </div>
  );
}
