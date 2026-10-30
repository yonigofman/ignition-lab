import type { Node, NodeProps } from "@xyflow/react";

export type ZoneNodeData = { label: string };
export type ZoneFlowNode = Node<ZoneNodeData, "zone">;

export function ZoneNode({ data }: NodeProps<ZoneFlowNode>) {
  return (
    <div className="h-full w-full rounded-xl border border-dashed border-(--border) bg-(--surface-muted)/60 shadow-inner">
      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
        {data.label}
      </div>
    </div>
  );
}
