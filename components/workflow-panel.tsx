"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "./icons";
import { groupCitationsBySource } from "@/lib/sources/group-citations";
import { canMarkComplete, detailHeaderKind, rowLabelText } from "@/lib/workflow/step-view";
import type { Citation, LabProgress, LabWorkflow } from "@/lib/shared/types";

/** Split a goal paragraph into scannable points without adding or rewording content. */
function splitGoalPoints(goal: string): string[] {
  const parts = goal.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(\[])/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.every((part) => part.length > 12)) return parts;
  return [goal];
}

function GoalBody({ goal }: { goal: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setExpanded(false);
  }, [goal]);
  useEffect(() => {
    if (expanded) return;
    const element = bodyRef.current;
    if (!element) return;
    const check = () => setOverflowing(element.scrollHeight - element.clientHeight > 4);
    check();
    const timer = window.setTimeout(check, 300);
    window.addEventListener("resize", check);
    return () => { window.clearTimeout(timer); window.removeEventListener("resize", check); };
  }, [goal, expanded]);
  const points = splitGoalPoints(goal);
  return (
    <>
      <div ref={bodyRef} className={`goal-body ${expanded ? "" : "goal-clamp"}`}>
        {points.length > 1 ? (
          <ul className="goal-points">{points.map((point) => <li key={point}>{point}</li>)}</ul>
        ) : (
          <p>{goal}</p>
        )}
      </div>
      {overflowing ? (
        <button type="button" className="show-goal" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? "Collapse goal" : "Show full goal"}
        </button>
      ) : null}
    </>
  );
}

/** Resolve a synthesized list, falling back to legacy pre-synthesis fields. */
function stepList(step: LabWorkflow["steps"][number], key: "requirements" | "whatToDo" | "howToDoIt" | "expectedOutput" | "warnings"): string[] {
  if (step[key].length) return step[key];
  if (key === "whatToDo") return step.requiredActions ?? [];
  if (key === "howToDoIt") return step.hints ?? [];
  return [];
}

function stepGoal(step: LabWorkflow["steps"][number]): string {
  return step.goal || step.description || "";
}

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
  onOpenCitation: (citation: Citation) => void;
  onSetCurrent: (id: string) => void;
  onComplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

export function WorkflowPanel({ workflow, progress, selectedId, loading, error, hasSources, open, onOpenChange, onSelect, onOpenCitation, onSetCurrent, onComplete, onPrevious, onNext, onRetry }: Props) {
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
  const selectedIndex = workflow && selected ? workflow.steps.findIndex((step) => step.id === selected.id) : -1;
  const currentDone = current ? progress.completedStepIds.includes(current.id) : false;
  const isCurrentStep = Boolean(current && selected && selected.id === current.id);
  const viewingOtherStep = Boolean(current && selected && selected.id !== current.id);
  const groupedSources = selected ? groupCitationsBySource(selected.sources) : [];

  function body() {
    if (loading) return <div className="workflow-side-body"><div className="workflow-status"><div className="state-spinner" /><div><span>Workflow</span><strong>Generating checklist…</strong><p>Chat is ready while this runs.</p></div></div></div>;
    if (error) return <div className="workflow-side-body"><div className="workflow-status workflow-unavailable"><div><span>Workflow unavailable</span><strong>{/timed out|too long/i.test(error) ? "Generation timed out." : "Generation failed."}</strong><p>{error}</p><button type="button" className="set-current-button" onClick={onRetry}>Retry</button></div></div></div>;
    if (!workflow) return <div className="workflow-side-body"><div className="centered-state"><span className="kicker">Workflow</span><strong>{hasSources ? "Preparing checklist…" : "Add materials to begin"}</strong><p>{hasSources ? "Sources are indexed — the checklist appears here once generation finishes." : "Ingest a repository or Markdown files and the checklist appears here."}</p></div></div>;

    const pct = total ? Math.round((completed / total) * 100) : 0;
    return (
      <>
        <div className="workflow-side-meta">
          <section className="goal-card" aria-label="Goal">
            <span className="kicker">Goal</span>
            <GoalBody goal={workflow.goal || workflow.title} />
          </section>
          <div className="progress-track" role="progressbar" aria-label="Workflow progress" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={total}><i style={{ width: `${pct}%` }} /></div>
          <p className="progress-count">{completed} of {total} steps complete</p>
        </div>
        {current && viewingOtherStep ? (
          <section className="focus-card" aria-live="polite">
            <span>Current step · {current.order} / {total}</span>
            <h2>Step {current.order} — {current.title}</h2>
            {stepGoal(current) ? <p className="focus-goal">{stepGoal(current)}</p> : null}
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
                <span><small>{rowLabelText({ isCurrent: active, isSelected: selected?.id === step.id, isDone: done, order: step.order })}</small><strong>{step.title}</strong></span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <section className="step-detail">
            <div><span>Step details · {detailHeaderKind(isCurrentStep, selected.order)}</span><i>{String(selected.order).padStart(2, "0")}</i></div>
            <h3>Step {selected.order} — {selected.title}</h3>
            {stepGoal(selected) ? <p className="detail-goal">{stepGoal(selected)}</p> : null}
            {stepList(selected, "requirements").length ? (<><h4>Requirements</h4><ul>{stepList(selected, "requirements").map((item) => <li key={item}>— {item}</li>)}</ul></>) : null}
            {stepList(selected, "whatToDo").length ? (<><h4>What to do</h4><ul>{stepList(selected, "whatToDo").map((action) => <li key={action}>— {action}</li>)}</ul></>) : null}
            {stepList(selected, "howToDoIt").length ? (<><h4>How to do it</h4><ol className="howto-list">{stepList(selected, "howToDoIt").map((hint) => <li key={hint}>{hint}</li>)}</ol></>) : null}
            {stepList(selected, "expectedOutput").length ? (<><h4>Expected output</h4><ul>{stepList(selected, "expectedOutput").map((item) => <li key={item}>— {item}</li>)}</ul></>) : null}
            {selected.successCriteria.length ? (<><h4>Done when</h4><ul className="criteria">{selected.successCriteria.map((item) => <li key={item}><CheckIcon size={14} />{item}</li>)}</ul></>) : null}
            {stepList(selected, "warnings").length ? (
              <><h4>Watch out</h4><ul className="warnings">{stepList(selected, "warnings").map((item) => <li key={item}>{item}</li>)}</ul></>
            ) : null}
            {groupedSources.length ? (
              <div className="step-sources">
                <span>{groupedSources.length === 1 ? "Source" : `${groupedSources.length} sources`}</span>
                <ul className="source-groups">
                  {groupedSources.map((group) => (
                    <li key={group.key}>
                      <button type="button" className="source-file" onClick={() => onOpenCitation(group.sections[0].citation)} title={`Open ${group.file}`}>{group.file}</button>
                      {group.sections.some((entry) => entry.section) ? (
                        <ul>{group.sections.filter((entry) => entry.section).map((entry) => (
                          <li key={entry.key}><button type="button" className="source-section" onClick={() => onOpenCitation(entry.citation)} title={`Open ${group.file} · ${entry.section}`}><i aria-hidden="true">↳</i>{entry.section}</button></li>
                        ))}</ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {selected.id !== current?.id ? <button type="button" className="set-current-button" onClick={() => onSetCurrent(selected.id)}>Set as current</button> : null}
            {viewingOtherStep && current ? <button type="button" className="set-current-button" onClick={() => onSelect(current.id)}>Return to current step</button> : null}
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
          <button type="button" onClick={onPrevious} disabled={selectedIndex <= 0}>Previous</button>
          <button type="button" className="mark-complete" onClick={onComplete} disabled={!canMarkComplete(isCurrentStep, currentDone, Boolean(current))}>{currentDone && isCurrentStep ? "Completed" : "Mark complete"}</button>
          <button type="button" onClick={onNext} disabled={selectedIndex < 0 || selectedIndex >= workflow.steps.length - 1}>Next</button>
          {viewingOtherStep ? <p className="mark-complete-hint">Set this step as current before marking it complete.</p> : null}
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
