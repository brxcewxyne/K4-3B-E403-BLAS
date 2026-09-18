import type { ReactNode } from "react";

export function TopBar({ title, completed, total, actions }: { title?: string; completed: number; total: number; actions?: ReactNode }) {
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return <header className="top-bar"><div className="brand"><span className="brand-orb"><i /><i /><i /></span><div><span>AI20k Lab Guide</span><strong>{title || "Add lab materials to begin"}</strong></div></div><div className="top-aside">{total ? <div className="top-progress" aria-label={`${completed} of ${total} workflow steps complete`}><div><span>Progress</span><strong>{completed} / {total}</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div> : null}{actions}</div></header>;
}
