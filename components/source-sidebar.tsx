import type { LabSource } from "@/mock/lab-data";

type Props = {
  lab: { title: string; subtitle: string };
  sources: LabSource[];
  selectedSourceId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
};

export function SourceSidebar({ lab, sources, selectedSourceId, onSelect, onAdd }: Props) {
  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  function sourceIcon(source: LabSource) {
    if (source.kind === "Archive") return "ZIP";
    if (source.kind === "Repository") return "GH";
    return "MD";
  }

  return (
    <aside className="source-sidebar" aria-label="Lab sources">
      <div className="panel-heading source-heading">
        <div>
          <div className="eyebrow">Current repository</div>
          <h1>{lab.title}</h1>
          <p>{lab.subtitle} · {sources.length} sources</p>
        </div>
      </div>

      <div className="source-section-title">
        <span>Sources</span>
        <span>{sources.length}</span>
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            className={`source-row ${selectedSourceId === source.id ? "is-selected" : ""}`}
            onClick={() => onSelect(source.id)}
          >
            <span className="file-icon">{sourceIcon(source)}</span>
            <span className="source-copy">
              <strong>{source.name}</strong>
              <span><i />{source.status}</span>
            </span>
          </button>
        ))}
      </div>

      <button className="add-material-button" type="button" onClick={onAdd}>
        <span aria-hidden="true">+</span> Add materials
      </button>

      {selectedSource ? (
        <div className="source-preview" aria-live="polite">
          <div className="preview-label">Selected source</div>
          <div className="preview-title">{selectedSource.name}</div>
          <div className="preview-section">{selectedSource.section}</div>
          <p>{selectedSource.preview}</p>
        </div>
      ) : null}
    </aside>
  );
}
