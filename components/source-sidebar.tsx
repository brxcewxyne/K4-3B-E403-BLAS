import { FileIcon, PlusIcon } from "./icons";
import type { SourceDocument } from "@/lib/shared/types";

type Props = { sources: SourceDocument[]; selectedId: string; repository?: string; onSelect: (id: string) => void; onAdd: () => void };

export function SourceSidebar({ sources, selectedId, repository, onSelect, onAdd }: Props) {
  const selected = sources.find((source) => source.id === selectedId);
  return <aside className="glass-panel source-panel"><header className="panel-head"><span className="kicker">Materials</span><h1>Sources</h1><p>{repository ? repository.replace("https://github.com/", "") : "Uploaded Markdown"}</p><span className="ready-line"><i />{sources.length} indexed</span></header><div className="source-list">{sources.length ? sources.map((source) => <button key={source.id} type="button" className={`source-item ${selectedId === source.id ? "selected" : ""}`} onClick={() => onSelect(source.id)}><FileIcon size={15} /><span><strong>{source.name}</strong><small>{source.path}</small></span><i /></button>) : <div className="panel-empty"><FileIcon size={22} /><strong>No sources yet</strong><p>Add a public GitHub repository or Markdown files.</p></div>}</div>{selected ? <section className="source-preview"><div><strong>{selected.name}</strong><span>{selected.type.toUpperCase()} · Indexed</span></div><span className="preview-label">Preview</span><p>“{selected.content.replace(/^#{1,6}\s+/gm, "").replace(/\s+/g, " ").slice(0, 220)}”</p></section> : null}<button className="add-button" type="button" onClick={onAdd}><PlusIcon size={14} />Add materials</button></aside>;
}
