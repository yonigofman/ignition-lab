import { useMemo, useState } from "react";
import type { InstallEvent, NodeId } from "../../engine/events";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { deriveInspectorView } from "./deriveInspectorView";

export interface InspectorProps {
  snapshot: ClusterSnapshot;
  events: InstallEvent[];
  selectedNodeId: NodeId | null;
}

export function Inspector({ snapshot, events, selectedNodeId }: InspectorProps) {
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
    <div className="flex h-full w-72 flex-col gap-3 border-l border-(--border) bg-(--surface-muted) p-3 text-sm text-(--text)">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Inspector</span>
        <button type="button" onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-white">
          ▶
        </button>
      </div>

      {!view && <p className="text-slate-500">Select a node to see details.</p>}

      {view && (
        <>
          <div className="text-lg font-semibold">{view.nodeId}</div>
          <dl className="grid grid-cols-2 gap-1 text-xs">
            <dt className="text-slate-500">Role</dt>
            <dd>{view.role ?? "—"}</dd>
            <dt className="text-slate-500">IP</dt>
            <dd>{view.ip ?? "—"}</dd>
            <dt className="text-slate-500">Phase</dt>
            <dd>{view.phase}</dd>
            <dt className="text-slate-500">Power</dt>
            <dd>{view.power}</dd>
            <dt className="text-slate-500">Ready</dt>
            <dd>{view.ready ? "yes" : "no"}</dd>
            <dt className="text-slate-500">Reboots</dt>
            <dd>{view.rebootCount}</dd>
            <dt className="text-slate-500">Ignition</dt>
            <dd>{view.ignitionFile ?? "—"}</dd>
          </dl>

          <div>
            <div className="mb-1 text-slate-500">Recent events</div>
            <ul className="space-y-1 text-xs text-slate-300">
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
