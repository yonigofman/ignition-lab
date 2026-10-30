export const EVENT_SCHEMA_VERSION = 1;

export type NodeId = string;

export interface BaseEvent {
  t: number;
  type: string;
  node?: NodeId;
  msg?: string;
  /** Who performed this step in the real world: "learner" (manual, UPI-style) or "installer" (automated). Only set on events worth contrasting with the other install path - drives the "who does this?" toggle. */
  actor?: "learner" | "installer";
  /** Shown by the "who does this?" toggle when set: what the learner would have had to do by hand on the other install path. */
  contrastNote?: string;
}

export type InstallEvent =
  // infrastructure
  | (BaseEvent & { type: "vm.power"; node: NodeId; state: "on" | "off" })
  | (BaseEvent & { type: "vm.reboot"; node: NodeId; reason: "install-to-disk" | "mcd-pivot" | "other" })
  | (BaseEvent & { type: "dhcp.lease"; node: NodeId; ip: string })
  | (BaseEvent & { type: "dns.query"; from: NodeId; name: string; result: "ok" | "nxdomain" })
  | (BaseEvent & { type: "dns.record"; name: string; ip?: string; action: "add" | "remove" })
  | (BaseEvent & {
      type: "lb.backend";
      frontend: 6443 | 22623 | 80 | 443;
      backend: NodeId;
      state: "up" | "down" | "removed";
    })
  | (BaseEvent & { type: "bmc.power"; node: NodeId; protocol: "redfish" | "ipmi"; action: "on" | "off" | "reset" })
  // ignition
  | (BaseEvent & {
      type: "ignition.fetched";
      node: NodeId;
      file: "bootstrap.ign" | "master.ign" | "worker.ign";
      from: NodeId;
      via?: NodeId;
    })
  | (BaseEvent & {
      type: "ignition.mcs_served";
      node: NodeId;
      pool: "master" | "worker";
      from: NodeId;
      via?: NodeId;
    })
  | (BaseEvent & { type: "ignition.failed"; node: NodeId; reason: string })
  // bootstrap / control plane
  | (BaseEvent & { type: "bootstrap.temp_control_plane_up" })
  | (BaseEvent & { type: "etcd.member_joined"; node: NodeId })
  | (BaseEvent & {
      type: "controlplane.pod_scheduled";
      node: NodeId;
      component: "kube-apiserver" | "kube-controller-manager" | "kube-scheduler" | "etcd";
    })
  | (BaseEvent & { type: "cvo.started" })
  | (BaseEvent & { type: "bootstrap.complete" })
  | (BaseEvent & { type: "bootstrap.removed" })
  // nodes & CSRs
  | (BaseEvent & { type: "node.registered"; node: NodeId; role: "master" | "worker" })
  | (BaseEvent & { type: "node.ready"; node: NodeId; ready: boolean })
  | (BaseEvent & { type: "csr.created"; id: string; node: NodeId; kind: "client" | "serving" })
  | (BaseEvent & { type: "csr.approved"; id: string; by: "auto" | "learner" | "machine-approver" })
  // operators
  | (BaseEvent & {
      type: "co.status";
      name: string;
      available: boolean;
      progressing: boolean;
      degraded: boolean;
    })
  | (BaseEvent & { type: "install.complete" })
  | (BaseEvent & { type: "install.failed"; reason: string })
  // upgrades
  | (BaseEvent & { type: "node.schedulable"; node: NodeId; schedulable: boolean })
  | (BaseEvent & { type: "clusterversion.update_started"; desired: string })
  | (BaseEvent & { type: "clusterversion.update_complete" })
  // learner + lesson
  | (BaseEvent & { type: "learner.action"; action: string; payload?: unknown })
  | (BaseEvent & { type: "lesson.gate"; gateId: string; state: "waiting" | "passed" });

export function maxEventTime(events: InstallEvent[]): number {
  return events.length === 0 ? 0 : Math.max(...events.map((e) => e.t));
}
