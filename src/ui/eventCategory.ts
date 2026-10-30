import type { InstallEvent } from "../engine/events";

export type EventCategory = "infra" | "ignition" | "control-plane" | "csr" | "operator" | "learner" | "lesson";

export function eventCategory(event: InstallEvent): EventCategory {
  switch (event.type) {
    case "vm.power":
    case "vm.reboot":
    case "dhcp.lease":
    case "dns.query":
    case "dns.record":
    case "lb.backend":
    case "bmc.power":
      return "infra";
    case "ignition.fetched":
    case "ignition.mcs_served":
    case "ignition.failed":
      return "ignition";
    case "bootstrap.temp_control_plane_up":
    case "etcd.member_joined":
    case "controlplane.pod_scheduled":
    case "cvo.started":
    case "bootstrap.complete":
    case "bootstrap.removed":
    case "node.registered":
    case "node.ready":
    case "node.schedulable":
    case "install.complete":
    case "install.failed":
      return "control-plane";
    case "csr.created":
    case "csr.approved":
      return "csr";
    case "co.status":
    case "clusterversion.update_started":
    case "clusterversion.update_complete":
      return "operator";
    case "learner.action":
      return "learner";
    case "lesson.gate":
      return "lesson";
  }
}

export function isFailureEvent(event: InstallEvent): boolean {
  switch (event.type) {
    case "ignition.failed":
    case "install.failed":
      return true;
    case "dns.query":
      return event.result === "nxdomain";
    case "co.status":
      return event.degraded;
    default:
      return false;
  }
}

const CATEGORY_COLORS: Record<EventCategory, string> = {
  infra: "#64748b",
  ignition: "#f59e0b",
  "control-plane": "#8b5cf6",
  csr: "#06b6d4",
  operator: "#22c55e",
  learner: "#ec4899",
  lesson: "#eab308",
};

export function categoryColor(category: EventCategory): string {
  return CATEGORY_COLORS[category];
}
