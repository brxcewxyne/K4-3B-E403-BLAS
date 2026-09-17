"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Props = { isDemoMode: boolean; onClose: () => void; onImportRepository: (url: string) => Promise<void>; onImportFile: (file: File) => Promise<void>; onAddLocalMaterial: (name: string, content: string) => Promise<void> };
type AddMode = "github" | "upload" | "paste";

export function AddMaterialsModal({ isDemoMode, onClose, onImportRepository, onImportFile, onAddLocalMaterial }: Props) {
  const [mode, setMode] = useState<AddMode>("github");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [filename, setFilename] = useState("notes.md");
  const [file, setFile] = useState<File>();
  const [status, setStatus] = useState<"idle" | "validating" | "importing" | "error">("idle");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape" && status !== "importing") onClose(); }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, status]);

  async function runImport(action: () => Promise<void>) {
    setStatus("importing"); setError("");
    try { await action(); } catch (caught) { setStatus("error"); setError(caught instanceof Error ? caught.message : "Import failed. Please try again."); }
  }

  function importRepository(event: FormEvent) {
    event.preventDefault();
    try { const url = new URL(repositoryUrl); if (url.hostname !== "github.com" && url.hostname !== "www.github.com") throw new Error(); }
    catch { setStatus("error"); setError("Enter a valid public GitHub repository URL."); return; }
    void runImport(() => onImportRepository(repositoryUrl.trim()));
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!/\.(zip|md|mdx)$/i.test(selected.name)) { setError("Choose a .zip, .md, or .mdx file."); setStatus("error"); return; }
    setFile(selected); setError(""); setStatus("idle");
  }

  const busy = status === "importing";
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}><section className="materials-modal" role="dialog" aria-modal="true" aria-labelledby="materials-title" aria-busy={busy}>
    <div className="modal-header"><div><div className="eyebrow">Knowledge sources</div><h2 id="materials-title">Add materials</h2><p>Import documentation without leaving your current workflow.</p></div><button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Close modal" disabled={busy}>×</button></div>
    <div className="material-tabs" role="tablist">{(["github", "upload", "paste"] as AddMode[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={mode === tab} onClick={() => { setMode(tab); setError(""); setStatus("idle"); }} className={mode === tab ? "active" : ""}>{tab === "github" ? "GitHub repository" : tab === "upload" ? "Upload files" : "Paste Markdown"}</button>)}</div>
    <div className="modal-content">
      {mode === "github" ? <form onSubmit={importRepository}><label className="field-label" htmlFor="repository-url">Repository URL</label><div className="url-field"><span>GH</span><input id="repository-url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/example/ai20k-lab" autoFocus disabled={busy} /></div><p className="field-help">{isDemoMode ? "Demo only: the URL will not be fetched or processed." : "Public repositories only. Markdown files are indexed by the existing backend."}</p><ModalError message={error} /><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={!repositoryUrl.trim() || busy}>{busy ? isDemoMode ? "Adding demo source…" : "Importing & indexing…" : "Import repository"}</button></div></form> : null}
      {mode === "upload" ? <div><label className="drop-zone" htmlFor="archive-upload"><span className="upload-icon">↑</span><strong>{file ? file.name : "Choose .zip, .md, or .mdx"}</strong><small>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · Ready` : isDemoMode ? "Demo only — files stay in this browser session" : "ZIP archives use the backend; Markdown opens locally"}</small><input id="archive-upload" type="file" accept=".zip,.md,.mdx" onChange={chooseFile} disabled={busy} /></label><p className="field-help">{isDemoMode ? "No upload or indexing request will be sent." : "Single .md/.mdx ingestion is not yet supported by the backend and remains a local preview."}</p><ModalError message={error} /><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="primary-button" onClick={() => file && void runImport(() => onImportFile(file))} disabled={!file || busy}>{busy ? isDemoMode ? "Adding demo source…" : "Uploading & indexing…" : "Add file"}</button></div></div> : null}
      {mode === "paste" ? <form onSubmit={(event) => { event.preventDefault(); if (markdown.trim()) void runImport(() => onAddLocalMaterial(filename.trim() || "notes.md", markdown.trim())); }}><label className="field-label" htmlFor="material-name">Filename or title</label><input className="plain-input" id="material-name" value={filename} onChange={(event) => setFilename(event.target.value)} placeholder="notes.md" disabled={busy} /><label className="field-label field-spaced" htmlFor="markdown-content">Markdown or text</label><textarea id="markdown-content" value={markdown} onChange={(event) => setMarkdown(event.target.value)} placeholder="# Lab notes\n\nPaste requirements, commands or troubleshooting notes here…" rows={9} autoFocus disabled={busy} /><p className="field-help">{isDemoMode ? "Demo only: content is added locally and is not sent to the backend." : "This unsupported backend mode is kept as a local preview and is excluded from AI grounding."}</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={!markdown.trim() || busy}>{busy ? "Adding demo source…" : "Add Markdown"}</button></div></form> : null}
    </div>
  </section></div>;
}

function ModalError({ message }: { message: string }) { return message ? <div className="modal-error" role="alert">{message}</div> : null; }
