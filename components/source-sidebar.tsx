import type { LabSource } from "@/lib/client-types";

type Props = { lab: { title: string; subtitle: string }; sources: LabSource[]; selectedSourceId: string; onSelect: (id: string) => void; onAdd: () => void };

function sourceIcon(source: LabSource) {
  if (source.kind === "Archive") return "ZIP";
  if (source.kind === "Repository") return "GH";
  return source.name.toLowerCase().endsWith(".mdx") ? "MDX" : "MD";
}

export function SourceSidebar({ lab, sources, selectedSourceId, onSelect, onAdd }: Props) {
  const selectedSource = sources.find((source) => source.id === selectedSourceId);
  const groups = sources.reduce<Record<string, LabSource[]>>((current, source) => {
    const folder = source.path.includes("/") ? source.path.split("/")[0] : "Repository";
    (current[folder] ||= []).push(source);
    return current;
  }, {});

  return <aside className="source-sidebar" aria-label="Lab sources">
    <div className="panel-heading source-heading"><div className="eyebrow">Current repository</div><h1>{lab.title}</h1><p title={lab.subtitle}>{lab.subtitle}</p><div className="source-summary"><span className="status-dot" />{sources.length} {sources.length === 1 ? "source" : "sources"} ready</div></div>
    {sources.length === 0 ? <div className="panel-empty"><strong>No materials yet</strong><p>Add a GitHub repository or ZIP archive to create your guide.</p></div> : Object.entries(groups).map(([group, groupSources]) => <div className="source-group" key={group}><div className="source-section-title"><span>{group}</span><span>{groupSources.length}</span></div><div className="source-list">{groupSources.map((source) => <button key={source.id} type="button" className={`source-row ${selectedSourceId === source.id ? "is-selected" : ""}`} onClick={() => onSelect(source.id)} aria-pressed={selectedSourceId === source.id}><span className="file-icon">{sourceIcon(source)}</span><span className="source-copy"><strong>{source.name}</strong><span><i className={`status-${source.status.toLowerCase()}`} />{source.status}</span></span></button>)}</div></div>)}
    <button className="add-material-button" type="button" onClick={onAdd}><span aria-hidden="true">+</span> Add materials</button>
    {selectedSource ? <div className="source-preview" aria-live="polite"><div className="preview-label">Selected source</div><div className="preview-title">{selectedSource.name}</div><div className="preview-section">{selectedSource.section}</div><p>{selectedSource.preview || "No preview available."}</p></div> : null}
  </aside>;
}
