import type { InstallEvent, NodeId } from "../../engine/events";
import type { Scenario, TopologyZone } from "../../engine/scenario";
import {
  defaultNodeState,
  type ClusterSnapshot,
  type NodePhase,
  type NodeRole,
  type RebootReason,
} from "../../engine/snapshot";

export type { TopologyZone } from "../../engine/scenario";
export type TopologyEdgeCategory = "ignition" | "mcs" | "dns" | "bmc";

export interface TopologyNodeView {
  id: NodeId;
  role: NodeRole;
  label: string;
  phase: NodePhase;
  power: "on" | "off";
  ready: boolean;
  rebootCount: number;
  lastRebootReason?: RebootReason;
  zone: TopologyZone;
  etcdMember: boolean;
  active: boolean;
  removed: boolean;
  highlighted: boolean;
}

export interface TopologyEdgeView {
  id: string;
  from: NodeId;
  to: NodeId;
  via?: NodeId;
  category: TopologyEdgeCategory;
  failed: boolean;
}

export interface TopologyView {
  nodes: TopologyNodeView[];
  edges: TopologyEdgeView[];
  etcdMembers: NodeId[];
}

const TOPOLOGY_EDGE_COLORS: Record<TopologyEdgeCategory, string> = {
  ignition: "#f59e0b",
  mcs: "#8b5cf6",
  dns: "#64748b",
  bmc: "#06b6d4",
};

export function topologyEdgeColor(category: TopologyEdgeCategory): string {
  return TOPOLOGY_EDGE_COLORS[category];
}

const INFRA_ROLES: ReadonlySet<NodeRole> = new Set(["helper", "lb"]);

function zoneForRole(role: NodeRole): TopologyZone {
  if (INFRA_ROLES.has(role)) return "infra";
  if (role === "provisioning") return "provisioning";
  return "cluster";
}

/** Which zones (in `order`) actually have at least one node, so a scenario that has no helper/lb (IPI) doesn't render an empty "Helper / infra" box, and vice versa. */
export function nonEmptyZones(nodes: TopologyNodeView[], order: TopologyZone[]): TopologyZone[] {
  return order.filter((zone) => nodes.some((n) => n.zone === zone));
}

function eventParticipants(event: InstallEvent): NodeId[] {
  const ids: NodeId[] = [];
  if (event.node) ids.push(event.node);
  switch (event.type) {
    case "dns.query":
      ids.push(event.from);
      break;
    case "ignition.fetched":
    case "ignition.mcs_served":
      ids.push(event.from);
      if (event.via) ids.push(event.via);
      break;
    case "lb.backend":
      ids.push(event.backend);
      break;
  }
  return ids;
}

function edgeForEvent(event: InstallEvent, index: number): TopologyEdgeView | null {
  switch (event.type) {
    case "ignition.fetched":
      return {
        id: `edge-${index}-${event.t}`,
        from: event.from,
        to: event.node,
        via: event.via,
        category: "ignition",
        failed: false,
      };
    case "ignition.mcs_served":
      return {
        id: `edge-${index}-${event.t}`,
        from: event.node,
        to: event.from,
        via: event.via,
        category: "mcs",
        failed: false,
      };
    case "bmc.power":
      return {
        id: `edge-${index}-${event.t}`,
        from: "provisioning",
        to: event.node,
        category: "bmc",
        failed: false,
      };
    case "dns.query":
      return {
        id: `edge-${index}-${event.t}`,
        from: event.from,
        to: "helper",
        category: "dns",
        failed: event.result === "nxdomain",
      };
    default:
      return null;
  }
}

export function deriveTopologyView(
  snapshot: ClusterSnapshot,
  topology: Scenario["topology"],
  events: InstallEvent[],
  activeWindowSeconds = 2,
  highlightedNodeId: NodeId | null = null
): TopologyView {
  const windowEvents = events.filter((e) => e.t <= snapshot.t && e.t > snapshot.t - activeWindowSeconds);
  const activeIds = new Set(windowEvents.flatMap(eventParticipants));

  const nodes: TopologyNodeView[] = topology.nodes.map((topoNode) => {
    const state = snapshot.nodes[topoNode.id] ?? defaultNodeState(topoNode.id);
    return {
      id: topoNode.id,
      role: topoNode.role,
      label: topoNode.label,
      phase: state.phase,
      power: state.power,
      ready: state.ready,
      rebootCount: state.rebootCount,
      lastRebootReason: state.lastRebootReason,
      zone: topoNode.zone ?? zoneForRole(topoNode.role),
      etcdMember: snapshot.etcdMembers.includes(topoNode.id),
      active: activeIds.has(topoNode.id),
      removed: topoNode.role === "bootstrap" && state.power === "off",
      highlighted: topoNode.id === highlightedNodeId,
    };
  });

  const edges = windowEvents
    .map((event, index) => edgeForEvent(event, index))
    .filter((edge): edge is TopologyEdgeView => edge !== null);

  return { nodes, edges, etcdMembers: snapshot.etcdMembers };
}
