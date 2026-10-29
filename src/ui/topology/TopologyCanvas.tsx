import { Background, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { InstallEvent, NodeId } from "../../engine/events";
import type { Scenario } from "../../engine/scenario";
import type { ClusterSnapshot } from "../../engine/snapshot";
import { ClusterNode, type ClusterFlowNode } from "./ClusterNode";
import { deriveTopologyView, nonEmptyZones, topologyEdgeColor, type TopologyZone } from "./deriveTopologyView";
import { EtcdRing } from "./EtcdRing";
import { ZoneNode, type ZoneFlowNode } from "./ZoneNode";

const NODE_TYPES = { cluster: ClusterNode, zone: ZoneNode };

const ZONE_LABEL: Record<TopologyZone, string> = {
  infra: "Helper / infra",
  provisioning: "Provisioning network",
  cluster: "Cluster network",
};
const ZONE_ORDER: TopologyZone[] = ["provisioning", "infra", "cluster"];
const NODE_WIDTH = 200;
const NODE_HEIGHT = 96;
const NODE_GAP = 16;
const ZONE_PADDING = 36;
const ZONE_GAP = 80;

export interface TopologyCanvasProps {
  snapshot: ClusterSnapshot;
  topology: Scenario["topology"];
  events: InstallEvent[];
  selectedNodeId: NodeId | null;
  onSelectNode: (nodeId: NodeId | null) => void;
  highlightedNodeId?: NodeId | null;
}

export function TopologyCanvas({
  snapshot,
  topology,
  events,
  selectedNodeId,
  onSelectNode,
  highlightedNodeId = null,
}: TopologyCanvasProps) {
  const view = useMemo(
    () => deriveTopologyView(snapshot, topology, events, 2, highlightedNodeId),
    [snapshot, topology, events, highlightedNodeId]
  );

  const nodes = useMemo<(ZoneFlowNode | ClusterFlowNode)[]>(() => {
    const byZone = new Map<TopologyZone, typeof view.nodes>();
    for (const node of view.nodes) {
      byZone.set(node.zone, [...(byZone.get(node.zone) ?? []), node]);
    }

    const flowNodes: (ZoneFlowNode | ClusterFlowNode)[] = [];
    let zoneX = 0;
    for (const zone of nonEmptyZones(view.nodes, ZONE_ORDER)) {
      const zoneNodes = byZone.get(zone) ?? [];
      const zoneId = `zone-${zone}`;
      const height = Math.max(zoneNodes.length, 1) * (NODE_HEIGHT + NODE_GAP) + ZONE_PADDING;
      const width = NODE_WIDTH + ZONE_PADDING * 2;

      flowNodes.push({
        id: zoneId,
        type: "zone",
        position: { x: zoneX, y: 0 },
        style: { width, height },
        zIndex: -1,
        selectable: false,
        draggable: false,
        data: { label: ZONE_LABEL[zone] },
      });

      zoneNodes.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: "cluster",
          parentId: zoneId,
          extent: "parent",
          position: { x: ZONE_PADDING, y: ZONE_PADDING + index * (NODE_HEIGHT + NODE_GAP) },
          selected: node.id === selectedNodeId,
          data: { view: node },
        });
      });

      zoneX += width + ZONE_GAP;
    }

    return flowNodes;
  }, [view, selectedNodeId]);

  const edges = useMemo<Edge[]>(() => {
    const staticEdges: Edge[] = topology.links.map((link) => ({
      id: `${link.source}->${link.target}`,
      source: link.source,
      target: link.target,
    }));

    const activeEdges: Edge[] = view.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      animated: true,
      style: { stroke: edge.failed ? "#ef4444" : topologyEdgeColor(edge.category), strokeWidth: 2 },
    }));

    return [...staticEdges, ...activeEdges];
  }, [topology.links, view]);

  const masterCount = useMemo(
    () => topology.nodes.filter((n) => n.role === "master").length,
    [topology.nodes]
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes as unknown as Node[]}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, node) => {
          if (node.type === "cluster") onSelectNode(node.id);
        }}
        onPaneClick={() => onSelectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
      {masterCount > 0 && (
        <div className="absolute right-3 top-3">
          <EtcdRing joined={view.etcdMembers.length} total={masterCount} />
        </div>
      )}
    </div>
  );
}
