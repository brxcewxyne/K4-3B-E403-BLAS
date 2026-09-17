"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileIcon, PlusIcon } from "./icons";
import { createSourceTeaser } from "@/lib/sources/teaser";
import type { SourceDocument } from "@/lib/shared/types";

type Props = {
  sources: SourceDocument[];
  selectedId: string;
  repository?: string;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
};

type Preview = { sourceId: string; top: number; left: number };

export function SourceSidebar({ sources, selectedId, repository, onSelect, onOpen, onAdd }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const teasers = useMemo(() => new Map(sources.map((source) => [source.id, createSourceTeaser(source)])), [sources]);
  const selected = sources.find((source) => source.id === selectedId);
  const previewSource = sources.find((source) => source.id === preview?.sourceId);
  const selectedTeaser = selected ? teasers.get(selected.id) : undefined;

  useEffect(() => () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function scheduleOpen(source: SourceDocument, target: HTMLElement) {
    cancelClose();
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const width = Math.min(370, window.innerWidth - 24);
      const fitsRight = rect.right + 12 + width <= window.innerWidth;
      const left = Math.max(12, fitsRight ? rect.right + 12 : rect.left - width - 12);
      const top = Math.max(12, Math.min(rect.top - 8, window.innerHeight - 330));
      setPreview({ sourceId: source.id, top, left });
    }, 200);
  }

  function scheduleClose() {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setPreview(null), 130);
  }

  function openSource(id: string) {
    setPreview(null);
    onSelect(id);
    onOpen(id);
  }

  return (
    <aside className="glass-panel source-panel">
      <header className="panel-head"><span className="kicker">Materials</span><h1>Sources</h1><p>{repository ? repository.replace("https://github.com/", "") : "Uploaded Markdown"}</p><span className="ready-line"><i />{sources.length} indexed</span></header>
      <div className="source-list" data-lenis-prevent>
        {sources.length ? sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`source-item ${selectedId === source.id ? "selected" : ""}`}
            onMouseEnter={(event) => scheduleOpen(source, event.currentTarget)}
            onMouseLeave={scheduleClose}
            onFocus={(event) => scheduleOpen(source, event.currentTarget)}
            onBlur={scheduleClose}
            onClick={() => openSource(source.id)}
            aria-describedby={preview?.sourceId === source.id ? "source-hover-preview" : undefined}
          >
            <FileIcon size={15} /><span><strong>{source.name}</strong><small>{source.path}</small></span><i />
          </button>
        )) : <div className="panel-empty"><FileIcon size={22} /><strong>No sources yet</strong><p>Add a public GitHub repository or Markdown files.</p></div>}
      </div>
      {selected && selectedTeaser ? (
        <section className="source-preview">
          <div><strong>{selected.name}</strong><span>{selected.type.toUpperCase()} · Indexed</span></div>
          <span className="preview-label">{selectedTeaser.title}</span><p>{selectedTeaser.excerpt}</p>
          <button type="button" onClick={() => openSource(selected.id)}>Open full source</button>
        </section>
      ) : null}
      <button className="add-button" type="button" onClick={onAdd}><PlusIcon size={14} />Add materials</button>
      {preview && previewSource ? createPortal(
        <div
          id="source-hover-preview"
          className="source-popover"
          role="tooltip"
          style={{ top: preview.top, left: preview.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div><FileIcon size={15} /><span><strong>{previewSource.name}</strong><small>{previewSource.path}</small></span><i>{previewSource.type.toUpperCase()}</i></div>
          <h3>{teasers.get(previewSource.id)?.title}</h3>
          <p>{teasers.get(previewSource.id)?.excerpt}</p>
          {teasers.get(previewSource.id)?.headings.length ? <section><span>Sections</span><ul>{teasers.get(previewSource.id)?.headings.map((heading) => <li key={heading}>{heading}</li>)}</ul></section> : null}
          <footer>Click to open complete source</footer>
        </div>,
        document.body
      ) : null}
    </aside>
  );
}
