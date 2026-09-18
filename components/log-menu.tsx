"use client";

import { useState } from "react";
import { clearSessionLog, downloadSessionLog, getSessionEventCount } from "@/lib/logging/session-log";

export function LogMenu() {
  const [count, setCount] = useState(0);

  function refresh() {
    setCount(getSessionEventCount());
  }

  function download() {
    downloadSessionLog();
  }

  function clear() {
    if (window.confirm("Clear the evaluation logs for this session? Workflow progress is kept.")) {
      clearSessionLog();
      refresh();
    }
  }

  return (
    <details className="log-menu" onToggle={(event) => { if (event.currentTarget.open) refresh(); }}>
      <summary aria-label="Session evaluation logs">Logs{count ? ` · ${count}` : ""}</summary>
      <div className="log-menu-panel">
        <p>{count ? `${count} evaluation event${count === 1 ? "" : "s"} in this session.` : "No evaluation events yet."}</p>
        <button type="button" onClick={download}>Download logs</button>
        <button type="button" onClick={clear}>Clear logs</button>
      </div>
    </details>
  );
}
