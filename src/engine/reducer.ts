import type { InstallEvent, NodeId } from "./events";
import { createInitialSnapshot, defaultNodeState, type ClusterSnapshot, type NodeState } from "./snapshot";

function updateNode(
  snapshot: ClusterSnapshot,
  nodeId: NodeId,
  update: (node: NodeState) => NodeState
): ClusterSnapshot {
  const existing = snapshot.nodes[nodeId] ?? defaultNodeState(nodeId);
  return {
    ...snapshot,
    nodes: { ...snapshot.nodes, [nodeId]: update(existing) },
  };
}

function appendLog(snapshot: ClusterSnapshot, line: string): ClusterSnapshot {
  return { ...snapshot, log: [...snapshot.log, line] };
}

function renderLogLine(event: InstallEvent): string {
  if (event.msg) return event.msg;
  switch (event.type) {
    case "vm.power":
      return `${event.node} powered ${event.state}`;
    case "vm.reboot":
      return `${event.node} rebooted (${event.reason})`;
    case "dhcp.lease":
      return `${event.node} leased ${event.ip}`;
    case "dns.query":
      return `${event.from} queried ${event.name} -> ${event.result}`;
    case "lb.backend":
      return `lb:${event.frontend} backend ${event.backend} ${event.state}`;
    case "bmc.power":
      return `${event.node} BMC(${event.protocol}) ${event.action}`;
    case "ignition.fetched":
      return `${event.node} fetched ${event.file} from ${event.from}${event.via ? ` via ${event.via}` : ""}`;
    case "ignition.mcs_served":
      return `${event.node} served ${event.pool} config to ${event.from}${event.via ? ` via ${event.via}` : ""}`;
    case "ignition.failed":
      return `${event.node} ignition failed: ${event.reason}`;
    case "bootstrap.temp_control_plane_up":
      return "temporary control plane up on bootstrap";
    case "etcd.member_joined":
      return `${event.node} joined etcd`;
    case "controlplane.pod_scheduled":
      return `${event.component} scheduled on ${event.node}`;
    case "cvo.started":
      return "cluster version operator started";
    case "bootstrap.complete":
      return "bootstrap complete";
    case "bootstrap.removed":
      return "bootstrap removed";
    case "node.registered":
      return `${event.node} registered as ${event.role}`;
    case "node.ready":
      return `${event.node} ready=${event.ready}`;
    case "csr.created":
      return `csr ${event.id} created for ${event.node} (${event.kind})`;
    case "csr.approved":
      return `csr ${event.id} approved by ${event.by}`;
    case "co.status":
      return `co/${event.name} available=${event.available} progressing=${event.progressing} degraded=${event.degraded}`;
    case "install.complete":
      return "install complete";
    case "install.failed":
      return `install failed: ${event.reason}`;
    case "learner.action":
      return `learner action: ${event.action}`;
    case "lesson.gate":
      return `gate ${event.gateId} ${event.state}`;
  }
}

export function reduce(snapshot: ClusterSnapshot, event: InstallEvent): ClusterSnapshot {
  let next: ClusterSnapshot = { ...snapshot, t: Math.max(snapshot.t, event.t) };
  if (next.phase === "not-started") {
    next = { ...next, phase: "bootstrapping" };
  }

  switch (event.type) {
    case "vm.power":
      next = updateNode(next, event.node, (n) => ({
        ...n,
        power: event.state,
        phase: event.state === "off" ? "off" : n.phase === "off" ? "booting" : n.phase,
      }));
      break;
    case "vm.reboot":
      next = updateNode(next, event.node, (n) => ({
        ...n,
        rebootCount: n.rebootCount + 1,
        lastRebootReason: event.reason,
        phase: "booting",
      }));
      break;
    case "dhcp.lease":
      next = updateNode(next, event.node, (n) => ({ ...n, ip: event.ip }));
      break;
    case "dns.query":
      break;
    case "lb.backend":
      next = {
        ...next,
        lb: {
          ...next.lb,
          [event.frontend]: { ...next.lb[event.frontend], [event.backend]: event.state },
        },
      };
      break;
    case "bmc.power":
      next = updateNode(next, event.node, (n) => ({
        ...n,
        power: event.action === "off" ? "off" : "on",
        rebootCount: event.action === "reset" ? n.rebootCount + 1 : n.rebootCount,
        phase: event.action === "off" ? "off" : n.phase === "off" ? "booting" : n.phase,
      }));
      break;
    case "ignition.fetched":
      next = updateNode(next, event.node, (n) => ({ ...n, phase: "installing" }));
      break;
    case "ignition.mcs_served":
      break;
    case "ignition.failed":
      next = updateNode(next, event.node, (n) => ({ ...n, phase: "failed" }));
      break;
    case "bootstrap.temp_control_plane_up":
      break;
    case "etcd.member_joined":
      next = {
        ...next,
        etcdMembers: next.etcdMembers.includes(event.node)
          ? next.etcdMembers
          : [...next.etcdMembers, event.node],
      };
      break;
    case "controlplane.pod_scheduled":
      break;
    case "cvo.started":
      break;
    case "bootstrap.complete":
      next = { ...next, phase: "bootstrap-complete" };
      break;
    case "bootstrap.removed":
      next = { ...next, phase: "converging" };
      if (event.node) {
        next = updateNode(next, event.node, (n) => ({ ...n, power: "off" }));
      }
      break;
    case "node.registered":
      next = updateNode(next, event.node, (n) => ({ ...n, role: event.role }));
      break;
    case "node.ready":
      next = updateNode(next, event.node, (n) => ({
        ...n,
        ready: event.ready,
        phase: event.ready ? "ready" : n.phase,
      }));
      break;
    case "csr.created":
      next = {
        ...next,
        csrs: [...next.csrs, { id: event.id, node: event.node, kind: event.kind, status: "pending" }],
      };
      break;
    case "csr.approved":
      next = {
        ...next,
        csrs: next.csrs.map((csr) =>
          csr.id === event.id ? { ...csr, status: "approved" as const, approvedBy: event.by } : csr
        ),
      };
      break;
    case "co.status":
      next = {
        ...next,
        clusterOperators: {
          ...next.clusterOperators,
          [event.name]: {
            name: event.name,
            available: event.available,
            progressing: event.progressing,
            degraded: event.degraded,
          },
        },
      };
      break;
    case "install.complete":
      next = { ...next, phase: "complete" };
      break;
    case "install.failed":
      next = { ...next, phase: "failed", failureReason: event.reason };
      break;
    case "learner.action":
      break;
    case "lesson.gate":
      break;
  }

  return appendLog(next, renderLogLine(event));
}

export function reduceAll(
  events: InstallEvent[],
  upToT: number,
  initial: ClusterSnapshot = createInitialSnapshot()
): ClusterSnapshot {
  const sorted = events.filter((e) => e.t <= upToT).sort((a, b) => a.t - b.t);
  return sorted.reduce(reduce, initial);
}
