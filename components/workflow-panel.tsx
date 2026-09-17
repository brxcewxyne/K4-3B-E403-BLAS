import type { WorkflowStep } from "@/lib/client-types";

type Props = { steps: WorkflowStep[]; completedStepIds: number[]; currentStepId?: number; selectedStepId: number; onSelectStep: (id: number) => void; onMarkComplete: () => void };

export function WorkflowPanel({ steps, completedStepIds, currentStepId, selectedStepId, onSelectStep, onMarkComplete }: Props) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) || steps[0];
  const currentStep = steps.find((step) => step.id === currentStepId);
  const progress = steps.length ? Math.round((completedStepIds.length / steps.length) * 100) : 0;
  const allComplete = steps.length > 0 && completedStepIds.length === steps.length;

  return <aside className="workflow-panel" aria-label="Lab progress">
    <div className="panel-heading workflow-heading"><div className="eyebrow">Lab progress</div><div className="progress-title-row"><h2>{completedStepIds.length} / {steps.length} completed</h2><strong>{progress}%</strong></div><div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><div className="goal-line"><span>Goal</span><strong>Complete this lab</strong></div></div>
    {currentStep ? <div className="focus-card"><div><span>Current focus</span><strong>{currentStep.title}</strong></div><div><span>Next action</span><p>{currentStep.actions[0] || currentStep.description}</p></div></div> : allComplete ? <div className="focus-card complete-focus"><span>Lab complete</span><strong>All workflow steps are done.</strong></div> : null}
    {steps.length ? <div className="workflow-list">{steps.map((step) => { const complete = completedStepIds.includes(step.id); const current = currentStepId === step.id; const selected = selectedStepId === step.id; return <button key={step.id} type="button" className={`workflow-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""} ${selected ? "is-inspected" : ""}`} onClick={() => onSelectStep(step.id)} aria-current={current ? "step" : undefined}><span className="step-marker">{complete ? "✓" : step.id}</span><span className="step-copy">{current ? <small>Current</small> : complete ? <small>Completed</small> : null}<strong>{step.title}</strong></span></button>; })}</div> : <div className="panel-empty"><strong>No workflow available</strong><p>Import materials to generate guided steps.</p></div>}
    {selectedStep ? <div className="step-details"><div className="detail-topline"><span>{completedStepIds.includes(selectedStep.id) ? "Completed" : selectedStep.id === currentStepId ? "Current" : "Step details"}</span><strong>{String(selectedStep.id).padStart(2, "0")}</strong></div><h3>{selectedStep.title}</h3><p>{selectedStep.description}</p>{selectedStep.actions.length ? <><div className="criteria-title">Required actions</div><ul className="action-list">{selectedStep.actions.map((action) => <li key={action}>{action}</li>)}</ul></> : null}<div className="criteria-title">Success criteria</div><ul>{selectedStep.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul>{selectedStep.sources.length ? <div className="step-sources"><span>Sources</span><p>{selectedStep.sources.join(" · ")}</p></div> : null}</div> : null}
    <button className="complete-button" type="button" onClick={onMarkComplete} disabled={allComplete || !currentStep}>{allComplete ? "Lab completed" : currentStep ? `Mark step ${currentStep.id} complete` : "No active step"}<span>→</span></button>
  </aside>;
}
