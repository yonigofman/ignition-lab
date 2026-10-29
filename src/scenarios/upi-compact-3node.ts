import type { Scenario, ScenarioStep } from "../engine/scenario";
import { buildStandardArtifacts } from "./standardArtifacts";

const BASE_DOMAIN = "lab.example.com";
const CLUSTER = "demo";
const MASTERS = ["master-0", "master-1", "master-2"];

const artifacts = buildStandardArtifacts({
  cluster: CLUSTER,
  baseDomain: BASE_DOMAIN,
  computeReplicas: 0,
  mastersSchedulable: true,
  clusterId: "3f2a9c10-5e4b-4f7a-9c1d-8b2e4a6f0d12",
  infraId: `${CLUSTER}-7x9kq`,
  workerIgnitionNote:
    "A pointer config, same idea as master.ign. This scenario has no workers, but create ignition-configs always writes one.",
});

const steps: ScenarioStep[] = [
  { kind: "chapter", title: "Bootstrap boots" },
  { kind: "event", event: { t: 0, type: "vm.power", node: "bootstrap", state: "on" } },
  { kind: "event", event: { t: 5, type: "dhcp.lease", node: "bootstrap", ip: "192.168.1.20" } },
  {
    kind: "event",
    event: { t: 10, type: "ignition.fetched", node: "bootstrap", file: "bootstrap.ign", from: "helper" },
  },
  { kind: "event", event: { t: 15, type: "bootstrap.temp_control_plane_up" } },
  {
    kind: "predict",
    id: "predict-temp-control-plane",
    question: "Now that bootstrap's temporary control plane is up, what happens next?",
    options: [
      "Masters boot, then fetch their pointer ignition and pull the full config via the MCS",
      "The cluster is immediately ready for use",
      "etcd scales to 3 members right away, before any master has booted",
    ],
    answer: 0,
    explain:
      "Masters boot from their pointer ignition (served by the helper), then pull the full machine config from bootstrap's Machine Config Server through the API load balancer.",
  },

  { kind: "chapter", title: "Masters join" },
  { kind: "event", event: { t: 20, type: "vm.power", node: "master-0", state: "on" } },
  { kind: "event", event: { t: 21, type: "vm.power", node: "master-1", state: "on" } },
  { kind: "event", event: { t: 22, type: "vm.power", node: "master-2", state: "on" } },
  { kind: "event", event: { t: 25, type: "dhcp.lease", node: "master-0", ip: "192.168.1.21" } },
  { kind: "event", event: { t: 26, type: "dhcp.lease", node: "master-1", ip: "192.168.1.22" } },
  { kind: "event", event: { t: 27, type: "dhcp.lease", node: "master-2", ip: "192.168.1.23" } },
  {
    kind: "event",
    event: { t: 30, type: "ignition.fetched", node: "master-0", file: "master.ign", from: "helper" },
  },
  {
    kind: "event",
    event: { t: 31, type: "ignition.fetched", node: "master-1", file: "master.ign", from: "helper" },
  },
  {
    kind: "event",
    event: { t: 32, type: "ignition.fetched", node: "master-2", file: "master.ign", from: "helper" },
  },
  { kind: "event", event: { t: 33, type: "vm.reboot", node: "master-0", reason: "install-to-disk" } },
  { kind: "event", event: { t: 33.5, type: "vm.reboot", node: "master-1", reason: "install-to-disk" } },
  { kind: "event", event: { t: 34, type: "vm.reboot", node: "master-2", reason: "install-to-disk" } },
  {
    kind: "event",
    event: { t: 35, type: "ignition.mcs_served", node: "bootstrap", pool: "master", from: "master-0", via: "lb" },
  },
  {
    kind: "event",
    event: { t: 36, type: "ignition.mcs_served", node: "bootstrap", pool: "master", from: "master-1", via: "lb" },
  },
  {
    kind: "event",
    event: { t: 37, type: "ignition.mcs_served", node: "bootstrap", pool: "master", from: "master-2", via: "lb" },
  },
  {
    kind: "predict",
    id: "predict-mcs-served",
    question: "All three masters have pulled their full config via the MCS. What happens next?",
    options: [
      "The temporary control plane schedules the production control plane onto the masters",
      "The masters immediately become Ready",
      "Bootstrap is destroyed immediately",
    ],
    answer: 0,
    explain:
      "The temporary control plane running on bootstrap schedules the production control plane's components onto the masters.",
  },

  { kind: "chapter", title: "Control plane comes up" },
  { kind: "event", event: { t: 40, type: "controlplane.pod_scheduled", node: "master-0", component: "etcd" } },
  {
    kind: "event",
    event: { t: 41, type: "controlplane.pod_scheduled", node: "master-0", component: "kube-apiserver" },
  },
  {
    kind: "event",
    event: { t: 42, type: "controlplane.pod_scheduled", node: "master-1", component: "kube-scheduler" },
  },
  { kind: "event", event: { t: 48, type: "cvo.started" } },
  { kind: "event", event: { t: 50, type: "etcd.member_joined", node: "master-0" } },
  { kind: "event", event: { t: 51, type: "etcd.member_joined", node: "master-1" } },
  { kind: "event", event: { t: 52, type: "etcd.member_joined", node: "master-2" } },
  {
    kind: "predict",
    id: "predict-cvo-etcd",
    question: "The CVO has started and etcd has scaled to 3 members. What happens next?",
    options: [
      "The temporary control plane hands over to the production control plane, and bootstrap reports complete",
      "The install is immediately complete",
      "Workers start booting",
    ],
    answer: 0,
    explain:
      "The temporary control plane hands over to the now-running production control plane, bootstrap injects the remaining OpenShift components, and openshift-install reports it's safe to remove the bootstrap resources.",
  },

  { kind: "chapter", title: "Bootstrap complete" },
  { kind: "event", event: { t: 60, type: "bootstrap.complete" } },
  {
    kind: "gate",
    gateId: "remove-bootstrap-from-lb",
    prompt:
      "Bootstrap has reported complete. Before it can be destroyed, remove it from both load balancer frontends.",
    hint: "Run `lab lb rm 6443 bootstrap` and `lab lb rm 22623 bootstrap` in the terminal.",
    check: (s) => s.lb[6443]?.bootstrap === "removed" && s.lb[22623]?.bootstrap === "removed",
  },
  { kind: "event", event: { t: 70, type: "bootstrap.removed", node: "bootstrap" } },

  { kind: "chapter", title: "Masters register and converge" },
  { kind: "event", event: { t: 75, type: "node.registered", node: "master-0", role: "master" } },
  { kind: "event", event: { t: 76, type: "node.registered", node: "master-1", role: "master" } },
  { kind: "event", event: { t: 77, type: "node.registered", node: "master-2", role: "master" } },
  { kind: "event", event: { t: 80, type: "csr.created", id: "csr-master-0-client", node: "master-0", kind: "client" } },
  { kind: "event", event: { t: 81, type: "csr.approved", id: "csr-master-0-client", by: "auto" } },
  { kind: "event", event: { t: 82, type: "csr.created", id: "csr-master-1-client", node: "master-1", kind: "client" } },
  { kind: "event", event: { t: 83, type: "csr.approved", id: "csr-master-1-client", by: "auto" } },
  { kind: "event", event: { t: 84, type: "csr.created", id: "csr-master-2-client", node: "master-2", kind: "client" } },
  { kind: "event", event: { t: 85, type: "csr.approved", id: "csr-master-2-client", by: "auto" } },
  { kind: "event", event: { t: 87, type: "vm.reboot", node: "master-0", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 87.5, type: "vm.reboot", node: "master-1", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 88, type: "vm.reboot", node: "master-2", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 90, type: "node.ready", node: "master-0", ready: true } },
  { kind: "event", event: { t: 91, type: "node.ready", node: "master-1", ready: true } },
  { kind: "event", event: { t: 92, type: "node.ready", node: "master-2", ready: true } },

  { kind: "event", event: { t: 100, type: "co.status", name: "etcd", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 101, type: "co.status", name: "kube-apiserver", available: true, progressing: false, degraded: false },
  },
  { kind: "event", event: { t: 110, type: "co.status", name: "network", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 115, type: "co.status", name: "dns", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 120, type: "co.status", name: "ingress", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 125, type: "co.status", name: "authentication", available: true, progressing: false, degraded: false },
  },
  { kind: "event", event: { t: 130, type: "co.status", name: "console", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 135, type: "co.status", name: "image-registry", available: false, progressing: false, degraded: false },
  },

  { kind: "chapter", title: "Install complete" },
  { kind: "event", event: { t: 150, type: "install.complete" } },
];

export const upiCompact3Node: Scenario = {
  id: "upi-compact-3node",
  title: "UPI compact 3-node cluster",
  mode: "upi",
  topology: {
    nodes: [
      { id: "helper", role: "helper", label: "Helper / bastion" },
      { id: "lb", role: "lb", label: "Load balancer" },
      { id: "bootstrap", role: "bootstrap", label: "Bootstrap" },
      { id: "master-0", role: "master", label: "master-0" },
      { id: "master-1", role: "master", label: "master-1" },
      { id: "master-2", role: "master", label: "master-2" },
    ],
    links: [
      { source: "helper", target: "lb" },
      { source: "lb", target: "bootstrap" },
      { source: "lb", target: "master-0" },
      { source: "lb", target: "master-1" },
      { source: "lb", target: "master-2" },
    ],
  },
  initialState: {
    dns: {
      [`api.${CLUSTER}.${BASE_DOMAIN}`]: "192.168.1.10",
      [`api-int.${CLUSTER}.${BASE_DOMAIN}`]: "192.168.1.10",
      [`*.apps.${CLUSTER}.${BASE_DOMAIN}`]: "192.168.1.10",
      [`bootstrap.${CLUSTER}.${BASE_DOMAIN}`]: "192.168.1.20",
      ...Object.fromEntries(MASTERS.map((m, i) => [`${m}.${CLUSTER}.${BASE_DOMAIN}`, `192.168.1.${21 + i}`])),
    },
    lb: {
      6443: { bootstrap: "up", "master-0": "down", "master-1": "down", "master-2": "down" },
      22623: { bootstrap: "up", "master-0": "down", "master-1": "down", "master-2": "down" },
      80: { "master-0": "up", "master-1": "up", "master-2": "up" },
      443: { "master-0": "up", "master-1": "up", "master-2": "up" },
    },
  },
  steps,
  artifacts,
};
