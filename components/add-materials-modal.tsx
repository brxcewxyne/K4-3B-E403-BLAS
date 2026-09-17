"use client";

import { FormEvent, useState } from "react";
import type { LabSource } from "@/mock/lab-data";

type Props = {
  onClose: () => void;
  onImportRepository: (url: string) => void;
  onAddMaterial: (name: string, kind: LabSource["kind"], preview: string) => void;
};

type AddMode = "github" | "upload" | "paste";

export function AddMaterialsModal({ onClose, onImportRepository, onAddMaterial }: Props) {
  const [mode, setMode] = useState<AddMode>("github");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [markdown, setMarkdown] = useState("");

  function importRepository(event: FormEvent) {
    event.preventDefault();
    if (repositoryUrl.trim()) onImportRepository(repositoryUrl.trim());
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="materials-modal" role="dialog" aria-modal="true" aria-labelledby="materials-title">
        <div className="modal-header">
          <div>
            <div className="eyebrow">Knowledge sources</div>
            <h2 id="materials-title">Add materials</h2>
            <p>Add lab documentation to this workspace.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        <div className="material-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "github"} onClick={() => setMode("github")} className={mode === "github" ? "active" : ""}>GitHub repository</button>
          <button type="button" role="tab" aria-selected={mode === "upload"} onClick={() => setMode("upload")} className={mode === "upload" ? "active" : ""}>Upload files</button>
          <button type="button" role="tab" aria-selected={mode === "paste"} onClick={() => setMode("paste")} className={mode === "paste" ? "active" : ""}>Paste Markdown</button>
        </div>

        <div className="modal-content">
          {mode === "github" ? (
            <form onSubmit={importRepository}>
              <label className="field-label" htmlFor="repository-url">Repository URL</label>
              <div className="url-field">
                <span>GH</span>
                <input
                  id="repository-url"
                  value={repositoryUrl}
                  onChange={(event) => setRepositoryUrl(event.target.value)}
                  placeholder="https://github.com/example/ai20k-lab"
                  autoFocus
                />
              </div>
              <p className="field-help">For this mockup, any URL will create a ready source immediately.</p>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={!repositoryUrl.trim()}>Import repository</button>
              </div>
            </form>
          ) : null}

          {mode === "upload" ? (
            <div>
              <button
                type="button"
                className="drop-zone"
                onClick={() => onAddMaterial("uploaded-lab.zip", "Archive", "Mock archive containing imported Markdown lab materials.")}
              >
                <span className="upload-icon">↑</span>
                <strong>Drop files here or browse</strong>
                <small>Supports .md, .mdx and .zip · Mock upload</small>
              </button>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
              </div>
            </div>
          ) : null}

          {mode === "paste" ? (
            <form onSubmit={(event) => {
              event.preventDefault();
              if (markdown.trim()) onAddMaterial("pasted-notes.md", "Markdown", markdown.trim().slice(0, 180));
            }}>
              <label className="field-label" htmlFor="markdown-content">Markdown or text</label>
              <textarea
                id="markdown-content"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                placeholder="# Lab notes\n\nPaste requirements, commands or troubleshooting notes here..."
                rows={9}
                autoFocus
              />
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-button" disabled={!markdown.trim()}>Add Markdown</button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
