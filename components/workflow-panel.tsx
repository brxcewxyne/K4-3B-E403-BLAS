"use client";

import { useEffect, useState } from "react";
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
  const [goalOpen, setGoalOpen] = useState(false);
  // Escape closes. No focus trap: this is a non-modal layout column, not a dialog.
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
          <button type="button" className="goal-toggle" onClick={() => setGoalOpen((value) => !value)} aria-expanded={goalOpen} aria-label="Toggle goal summary">
            <span>Goal</span><em>{completed}/{total}</em><i aria-hidden="true">{goalOpen ? "▴" : "▾"}</i>
          </button>
          <p className={`goal-text ${goalOpen ? "" : "clamp"}`}>{workflow.goal || workflow.title}</p>
          <div className="progress-track" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${pct}%` }} /></div>
        </div>
        {current ? (
          <section className="focus-card" aria-live="polite">
            <span>Current step · {current.order} / {total}</span>
            <h2>Step {current.order} — {current.title}</h2>
            <div>
              <h4>What to do</h4>
              {currentDone ? <p>Completed — revisiting.</p> : null}
              <ul>{(current.requiredActions.length ? current.requiredActions.slice(0, 3) : [current.description || "The source defines this step but does not provide detailed execution instructions."]).map((action) => <li key={action}>— {action}</li>)}</ul>
              <h4>How to do it</h4>
              {current.hints.length ? <ol className="howto-list">{current.hints.slice(0, 3).map((hint) => <li key={hint}>{hint}</li>)}</ol> : <p>The source defines this step but does not provide detailed execution instructions.</p>}
            </div>
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
                <span className="step-marker">{done ? <CheckIcon size={14} /> : step.order}</span>
                <span><small>{active ? "Current" : done ? "Completed" : `Step ${step.order}`}</small><strong>{step.title}</strong><em className="row-summary">{step.requiredActions[0] || step.description}</em></span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <section className="step-detail">
            <div><span>{selected.id === current?.id ? "Current step" : progress.completedStepIds.includes(selected.id) ? "Completed" : "Step details"}</span><i>{String(selected.order).padStart(2, "0")}</i></div>
            <h3>Step {selected.order} — {selected.title}</h3>
            {selected.description ? <p>{selected.description}</p> : null}
            <h4>What to do</h4>
            {selected.requiredActions.length ? <ul>{selected.requiredActions.map((action) => <li key={action}>— {action}</li>)}</ul> : <p>The source defines this step but does not provide detailed execution instructions.</p>}
            <h4>How to do it</h4>
            {selected.hints.length ? <ol className="howto-list">{selected.hints.map((hint) => <li key={hint}>{hint}</li>)}</ol> : <p>The source defines this step but does not provide detailed execution instructions.</p>}
            <h4>Success criteria</h4>
            {selected.successCriteria.length ? <ul className="criteria">{selected.successCriteria.map((item) => <li key={item}><CheckIcon size={14} />{item}</li>)}</ul> : <p>No explicit success criteria in the sources — confirm with the lab materials before moving on.</p>}
            {selected.sources.length ? <div className="step-sources"><span>Sources</span><ul>{selected.sources.map((source) => <li key={`${source.sourceId}-${source.section}`}>{source.file}{source.section ? ` · ${source.section}` : ""}</li>)}</ul></div> : null}
            {selected.id !== current?.id ? <button type="button" className="set-current-button" onClick={() => onSetCurrent(selected.id)}>Set as current</button> : null}
          </section>
        ) : null}
        {workflow.checkpoints?.length ? (
          <section className="step-detail">
            <div><span>Checkpoints</span></div>
            {workflow.checkpoints.map((checkpoint) => (
              <div key={checkpoint.title} className="checkpoint-block">
                <h3>{checkpoint.title}</h3>
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
    <div className={`workflow-col ${open ? "is-open" : ""}`}>
      {!open ? (
        <button
          type="button"
          className="workflow-trigger"
          aria-expanded={false}
          aria-controls="workflow-side-panel"
          onClick={() => onOpenChange(true)}
        >
          <span className="workflow-trigger-dot" aria-hidden="true" />
          Workflow
          {total ? <em>{completed}/{total}</em> : null}
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <aside
          id="workflow-side-panel"
          className="workflow-side glass-panel open"
          role="complementary"
          aria-label="Lab workflow checklist"
          data-lenis-prevent
        >
          <header className="workflow-side-head">
            <div><span className="kicker">Workflow</span><h2>{workflow?.title || "Checklist"}</h2></div>
            <button type="button" className="icon-button" onClick={() => onOpenChange(false)} aria-label="Close workflow panel">✕</button>
          </header>
          {body()}
        </aside>
      )}
    </div>
  );
}
