import type { WorkflowStep } from "@/mock/lab-data";

type Props = {
  steps: WorkflowStep[];
  completedStepIds: number[];
  currentStepId?: number;
  selectedStepId: number;
  onSelectStep: (id: number) => void;
  onMarkComplete: () => void;
};

export function WorkflowPanel({ steps, completedStepIds, currentStepId, selectedStepId, onSelectStep, onMarkComplete }: Props) {
  const selectedStep = steps.find((step) => step.id === selectedStepId) || steps[0];
  const progress = Math.round((completedStepIds.length / steps.length) * 100);
  const allComplete = completedStepIds.length === steps.length;

  return (
    <aside className="workflow-panel" aria-label="Lab progress">
      <div className="panel-heading workflow-heading">
        <div className="eyebrow">Lab progress</div>
        <div className="progress-title-row">
          <h2>{completedStepIds.length} / {steps.length} completed</h2>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="goal-line"><span>Goal</span><strong>Complete AI Agent Lab</strong></div>
      </div>

      <div className="workflow-list">
        {steps.map((step) => {
          const complete = completedStepIds.includes(step.id);
          const current = currentStepId === step.id;
          const selected = selectedStepId === step.id;
          return (
            <button
              key={step.id}
              type="button"
              className={`workflow-step ${complete ? "is-complete" : ""} ${current ? "is-current" : ""} ${selected ? "is-inspected" : ""}`}
              onClick={() => onSelectStep(step.id)}
            >
              <span className="step-marker">{complete ? "✓" : step.id}</span>
              <span className="step-copy">
                {current ? <small>Current step</small> : null}
                <strong>{step.title}</strong>
              </span>
            </button>
          );
        })}
      </div>

      <div className="step-details">
        <div className="detail-topline">
          <span>{completedStepIds.includes(selectedStep.id) ? "Completed" : selectedStep.id === currentStepId ? "Current" : "Step details"}</span>
          <strong>0{selectedStep.id}</strong>
        </div>
        <h3>{selectedStep.title}</h3>
        <p>{selectedStep.description}</p>
        <div className="criteria-title">Success criteria</div>
        <ul>
          {selectedStep.criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
        </ul>
      </div>

      <button className="complete-button" type="button" onClick={onMarkComplete} disabled={allComplete}>
        {allComplete ? "Lab completed" : `Mark step ${currentStepId} as complete`} <span>→</span>
      </button>
    </aside>
  );
}
