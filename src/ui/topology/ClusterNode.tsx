import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, useReducedMotion } from "motion/react";
import type { TopologyNodeView } from "./deriveTopologyView";

const PHASE_RING_COLOR: Record<TopologyNodeView["phase"], string> = {
  off: "#374151",
  booting: "#eab308",
  installing: "#f59e0b",
  ready: "#22c55e",
  failed: "#ef4444",
};

const REBOOT_REASON_LABEL: Record<NonNullable<TopologyNodeView["lastRebootReason"]>, string> = {
  "install-to-disk": "reinstall",
  "mcd-pivot": "pivot",
  other: "reboot",
};

const REBOOT_REASON_COLOR: Record<NonNullable<TopologyNodeView["lastRebootReason"]>, string> = {
  "install-to-disk": "#f59e0b",
  "mcd-pivot": "#a855f7",
  other: "#94a3b8",
};

export type ClusterNodeData = { view: TopologyNodeView };
export type ClusterFlowNode = Node<ClusterNodeData, "cluster">;

export function ClusterNode({ data }: NodeProps<ClusterFlowNode>) {
  const { view } = data;
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="rounded-lg border-2 bg-(--surface) px-3 py-2 text-xs text-(--text) shadow-lg"
      style={{ borderColor: PHASE_RING_COLOR[view.phase] }}
      animate={
        prefersReducedMotion
          ? { opacity: view.removed ? 0.15 : view.power === "on" ? 1 : 0.5 }
          : {
              opacity: view.removed ? 0.15 : view.power === "on" ? 1 : 0.5,
              scale: view.removed ? 0.85 : view.active ? [1, 1.08, 1] : 1,
              rotate: view.active && view.rebootCount > 0 && view.phase === "booting" ? [0, -4, 4, 0] : 0,
              boxShadow: view.active ? `0 0 16px ${PHASE_RING_COLOR[view.phase]}` : "0 0 0px transparent",
            }
      }
      transition={{ duration: view.removed ? 1.2 : 0.4 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="font-semibold">{view.label}</div>
      <div className="text-gray-400">{view.role}</div>
      <div className="mt-1 flex items-center gap-1">
        <span className="rounded px-1" style={{ backgroundColor: PHASE_RING_COLOR[view.phase] }}>
          {view.phase}
        </span>
        {view.rebootCount > 0 && (
          <span className="text-gray-400">
            ↻{view.rebootCount}
            {view.lastRebootReason && (
              <span className="ml-1" style={{ color: REBOOT_REASON_COLOR[view.lastRebootReason] }}>
                {REBOOT_REASON_LABEL[view.lastRebootReason]}
              </span>
            )}
          </span>
        )}
      </div>
      {view.etcdMember && <div className="mt-1 text-cyan-400">etcd member</div>}
      {view.removed && <div className="mt-1 text-gray-500">removed from cluster</div>}
      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}
