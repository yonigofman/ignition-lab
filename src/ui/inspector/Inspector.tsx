import { useMemo, useState } from "react";
import type { InstallEvent, NodeId } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { deriveInspectorView } from "./deriveInspectorView";

export interface InspectorProps {
  snapshot: ClusterSnapshot;
  events: InstallEvent[];
  selectedNodeId: NodeId | null;
  width?: number;
}

export function Inspector({ snapshot, events, selectedNodeId, width }: InspectorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const view = useMemo(
    () => deriveInspectorView(snapshot, events, selectedNodeId),
    [snapshot, events, selectedNodeId]
  );

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="h-full w-6 border-l border-(--border) bg-(--surface-muted) text-xs text-(--text-muted) hover:text-(--text)"
      >
        ◀
      </button>
    );
  }

  return (
    <div
      className="flex h-full w-72 flex-col gap-3 border-l border-(--border) bg-(--surface-muted) p-3 text-sm text-(--text)"
      style={width ? { width } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">Inspector</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-(--text-muted) hover:text-(--text)"
        >
          ▶
        </button>
      </div>

      {!view && <p className="text-(--text-muted)">Select a node to see details.</p>}

      {view && (
        <>
          <div className="text-lg font-semibold">{view.nodeId}</div>
          <dl className="grid grid-cols-2 gap-1 text-xs">
            <dt className="text-(--text-muted)">Role</dt>
            <dd>{view.role ?? "—"}</dd>
            <dt className="text-(--text-muted)">IP</dt>
            <dd>{view.ip ?? "—"}</dd>
            <dt className="text-(--text-muted)">Phase</dt>
            <dd>{view.phase}</dd>
            <dt className="text-(--text-muted)">Power</dt>
            <dd>{view.power}</dd>
            <dt className="text-(--text-muted)">Ready</dt>
            <dd>{view.ready ? "yes" : "no"}</dd>
            <dt className="text-(--text-muted)">Reboots</dt>
            <dd>{view.rebootCount}</dd>
            <dt className="text-(--text-muted)">Ignition</dt>
            <dd>{view.ignitionFile ?? "—"}</dd>
          </dl>

          <div>
            <div className="mb-1 text-(--text-muted)">Recent events</div>
            <ul className="space-y-1 text-xs text-(--text-muted)">
              {view.recentLog.map((line, i) => (
                <li key={i} className="truncate">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
