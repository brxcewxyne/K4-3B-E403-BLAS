export function TopBar({ title, sourceCount }: { title?: string; sourceCount: number }) {
  return <header className="top-bar"><div className="brand"><span className="brand-orb"><i /><i /><i /></span><span>AI20k Lab Guide</span></div><div className="lab-path"><span>Workspace</span><i>/</i><strong>{title || "Add lab materials to begin"}</strong></div><div className="top-actions"><span className="status-chip"><i />{sourceCount} sources</span><span className="server-chip">AI connected server-side</span><span className="avatar">ST</span></div></header>;
}
