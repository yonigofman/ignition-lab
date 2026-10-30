import type { ScenarioArtifact } from "../../engine/scenario";
import { highlightLine } from "./highlightLine";

export interface ArtifactsPanelProps {
  artifacts: ScenarioArtifact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  height?: number;
}

export function ArtifactsPanel({ artifacts, selectedId, onSelect, onClose, height }: ArtifactsPanelProps) {
  const selectedArtifact = artifacts.find((a) => a.id === selectedId) ?? artifacts[0];

  return (
    <div
      className="flex h-64 shrink-0 border-t border-(--border) bg-(--surface)"
      style={height ? { height } : undefined}
    >
      <div className="w-56 shrink-0 overflow-y-auto border-r border-(--border)">
        <div className="flex items-center justify-between border-b border-(--border) px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-(--text-muted)">Files</span>
          <button type="button" onClick={onClose} className="text-xs text-(--text-muted) hover:text-(--text)">
            ✕
          </button>
        </div>
        <ul>
          {artifacts.map((artifact) => (
            <li key={artifact.id}>
              <button
                type="button"
                onClick={() => onSelect(artifact.id)}
                className={`w-full truncate px-3 py-1.5 text-left text-xs ${
                  artifact.id === selectedArtifact?.id
                    ? "bg-(--surface-muted) text-(--text)"
                    : "text-(--text-muted) hover:text-(--text)"
                }`}
              >
                {artifact.path}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedArtifact && (
          <>
            <div className="border-b border-(--border) px-3 py-2 text-xs text-(--text-muted)">
              {selectedArtifact.path}
              {selectedArtifact.note && <div className="mt-1 text-(--text-muted)">{selectedArtifact.note}</div>}
            </div>
            <pre className="whitespace-pre p-3 font-mono text-xs leading-relaxed text-(--text)">
              {selectedArtifact.content.split("\n").map((line, index) => (
                <div key={index}>
                  {highlightLine(line, selectedArtifact.language).map((token, tokenIndex) => (
                    <span key={tokenIndex} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                  {line.length === 0 && " "}
                </div>
              ))}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
