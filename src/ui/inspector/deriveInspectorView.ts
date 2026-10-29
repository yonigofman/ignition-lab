import type { InstallEvent, NodeId } from "../../engine/events";
import { defaultNodeState, type ClusterSnapshot, type NodePhase, type NodeRole } from "../../engine/snapshot";

export interface InspectorView {
  nodeId: NodeId;
  role?: NodeRole;
  ip?: string;
  phase: NodePhase;
  power: "on" | "off";
  ready: boolean;
  rebootCount: number;
  ignitionFile: "bootstrap.ign" | "master.ign" | "worker.ign" | null;
  recentLog: string[];
}

export function deriveInspectorView(
  snapshot: ClusterSnapshot,
  events: InstallEvent[],
  nodeId: NodeId | null,
  recentLogLimit = 10
): InspectorView | null {
  if (!nodeId) return null;

  const state = snapshot.nodes[nodeId] ?? defaultNodeState(nodeId);

  const ignitionFile =
    events
      .filter(
        (e): e is InstallEvent & { type: "ignition.fetched" } =>
          e.t <= snapshot.t && e.type === "ignition.fetched" && e.node === nodeId
      )
      .sort((a, b) => a.t - b.t)
      .at(-1)?.file ?? null;

  const recentLog = snapshot.log.filter((line) => line.includes(nodeId)).slice(-recentLogLimit);

  return {
    nodeId,
    role: state.role,
    ip: state.ip,
    phase: state.phase,
    power: state.power,
    ready: state.ready,
    rebootCount: state.rebootCount,
    ignitionFile,
    recentLog,
  };
}
