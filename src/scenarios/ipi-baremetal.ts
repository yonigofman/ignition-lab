import type { Scenario, ScenarioStep } from "../engine/scenario";
import { buildIpiBaremetalArtifacts } from "./ipiBaremetalArtifacts";

const BASE_DOMAIN = "lab.example.com";
const CLUSTER = "demo";
const MASTERS = ["master-0", "master-1", "master-2"];
const WORKERS = ["worker-0", "worker-1"];
const API_VIP = "192.168.1.100";
const INGRESS_VIP = "192.168.1.101";

const BMC: Record<string, { address: string; mac: string }> = {
  "master-0": { address: "redfish://192.168.2.21/redfish/v1/Systems/1", mac: "52:54:00:aa:00:00" },
  "master-1": { address: "redfish://192.168.2.22/redfish/v1/Systems/1", mac: "52:54:00:aa:00:01" },
  "master-2": { address: "redfish://192.168.2.23/redfish/v1/Systems/1", mac: "52:54:00:aa:00:02" },
  "worker-0": { address: "redfish://192.168.2.31/redfish/v1/Systems/1", mac: "52:54:00:aa:00:10" },
  "worker-1": { address: "redfish://192.168.2.32/redfish/v1/Systems/1", mac: "52:54:00:aa:00:11" },
};

const CSR_AUTO_APPROVE_NOTE_CLIENT =
  "The machine-approver approves client CSRs for Machines it created. In UPI, you'd run `oc adm certificate approve` on each worker's client CSR yourself.";
const CSR_AUTO_APPROVE_NOTE_SERVING =
  "The machine-approver approves the kubelet serving CSR too. In UPI, you'd approve this one by hand as well, after the client CSR.";
const BOOTSTRAP_REMOVED_NOTE =
  "The installer destroys bootstrap and removes it from the on-cluster VIP automatically. In UPI, you'd run `lab lb rm 6443 bootstrap` and `lab lb rm 22623 bootstrap` yourself first.";

const steps: ScenarioStep[] = [
  { kind: "chapter", title: "Provisioning host boots bootstrap" },
  { kind: "event", event: { t: 0, type: "bmc.power", node: "bootstrap", protocol: "redfish", action: "on" } },
  { kind: "event", event: { t: 5, type: "dhcp.lease", node: "bootstrap", ip: "192.168.2.20" } },
  {
    kind: "event",
    event: { t: 10, type: "ignition.fetched", node: "bootstrap", file: "bootstrap.ign", from: "provisioning" },
  },
  { kind: "event", event: { t: 15, type: "bootstrap.temp_control_plane_up" } },

  { kind: "chapter", title: "Ironic powers on masters over BMC" },
  ...MASTERS.map(
    (m, i): ScenarioStep => ({
      kind: "event",
      event: { t: 20 + i, type: "bmc.power", node: m, protocol: "redfish", action: "on" },
    })
  ),
  ...MASTERS.map(
    (m, i): ScenarioStep => ({ kind: "event", event: { t: 25 + i, type: "dhcp.lease", node: m, ip: `192.168.2.${21 + i}` } })
  ),
  ...MASTERS.map(
    (m, i): ScenarioStep => ({
      kind: "event",
      event: { t: 30 + i, type: "ignition.fetched", node: m, file: "master.ign", from: "provisioning" },
    })
  ),
  ...MASTERS.map(
    (m, i): ScenarioStep => ({
      kind: "event",
      event: { t: 33 + i * 0.5, type: "vm.reboot", node: m, reason: "install-to-disk" },
    })
  ),
  ...MASTERS.map(
    (m, i): ScenarioStep => ({
      kind: "event",
      event: { t: 35 + i, type: "ignition.mcs_served", node: "bootstrap", pool: "master", from: m },
    })
  ),

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

  { kind: "chapter", title: "Bootstrap complete" },
  { kind: "event", event: { t: 60, type: "bootstrap.complete" } },
  {
    kind: "event",
    event: {
      t: 65,
      type: "bootstrap.removed",
      node: "bootstrap",
      actor: "installer",
      contrastNote: BOOTSTRAP_REMOVED_NOTE,
    },
  },

  { kind: "chapter", title: "Masters register and converge" },
  { kind: "event", event: { t: 75, type: "node.registered", node: "master-0", role: "master" } },
  { kind: "event", event: { t: 76, type: "node.registered", node: "master-1", role: "master" } },
  { kind: "event", event: { t: 77, type: "node.registered", node: "master-2", role: "master" } },
  { kind: "event", event: { t: 80, type: "csr.created", id: "csr-master-0-client", node: "master-0", kind: "client" } },
  { kind: "event", event: { t: 81, type: "csr.approved", id: "csr-master-0-client", by: "machine-approver" } },
  { kind: "event", event: { t: 82, type: "csr.created", id: "csr-master-1-client", node: "master-1", kind: "client" } },
  { kind: "event", event: { t: 83, type: "csr.approved", id: "csr-master-1-client", by: "machine-approver" } },
  { kind: "event", event: { t: 84, type: "csr.created", id: "csr-master-2-client", node: "master-2", kind: "client" } },
  { kind: "event", event: { t: 85, type: "csr.approved", id: "csr-master-2-client", by: "machine-approver" } },
  { kind: "event", event: { t: 87, type: "vm.reboot", node: "master-0", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 87.5, type: "vm.reboot", node: "master-1", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 88, type: "vm.reboot", node: "master-2", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 90, type: "node.ready", node: "master-0", ready: true } },
  { kind: "event", event: { t: 91, type: "node.ready", node: "master-1", ready: true } },
  { kind: "event", event: { t: 92, type: "node.ready", node: "master-2", ready: true } },

  { kind: "chapter", title: "Ironic powers on workers over BMC" },
  ...WORKERS.map(
    (w, i): ScenarioStep => ({
      kind: "event",
      event: { t: 95 + i, type: "bmc.power", node: w, protocol: "redfish", action: "on" },
    })
  ),
  ...WORKERS.map(
    (w, i): ScenarioStep => ({ kind: "event", event: { t: 98 + i, type: "dhcp.lease", node: w, ip: `192.168.2.${31 + i}` } })
  ),
  ...WORKERS.map(
    (w, i): ScenarioStep => ({
      kind: "event",
      event: { t: 101 + i, type: "ignition.fetched", node: w, file: "worker.ign", from: "provisioning" },
    })
  ),
  ...WORKERS.map(
    (w, i): ScenarioStep => ({
      kind: "event",
      event: { t: 103 + i * 0.5, type: "vm.reboot", node: w, reason: "install-to-disk" },
    })
  ),
  ...WORKERS.map(
    (w, i): ScenarioStep => ({
      kind: "event",
      event: { t: 105 + i, type: "ignition.mcs_served", node: "master-0", pool: "worker", from: w },
    })
  ),
  { kind: "event", event: { t: 108, type: "node.registered", node: "worker-0", role: "worker" } },
  { kind: "event", event: { t: 109, type: "node.registered", node: "worker-1", role: "worker" } },
  {
    kind: "event",
    event: { t: 110, type: "csr.created", id: "csr-worker-0-client", node: "worker-0", kind: "client" },
  },
  {
    kind: "event",
    event: { t: 111, type: "csr.created", id: "csr-worker-1-client", node: "worker-1", kind: "client" },
  },
  {
    kind: "event",
    event: {
      t: 112,
      type: "csr.approved",
      id: "csr-worker-0-client",
      by: "machine-approver",
      actor: "installer",
      contrastNote: CSR_AUTO_APPROVE_NOTE_CLIENT,
    },
  },
  {
    kind: "event",
    event: {
      t: 113,
      type: "csr.approved",
      id: "csr-worker-1-client",
      by: "machine-approver",
      actor: "installer",
      contrastNote: CSR_AUTO_APPROVE_NOTE_CLIENT,
    },
  },
  {
    kind: "event",
    event: { t: 115, type: "csr.created", id: "csr-worker-0-serving", node: "worker-0", kind: "serving" },
  },
  {
    kind: "event",
    event: { t: 116, type: "csr.created", id: "csr-worker-1-serving", node: "worker-1", kind: "serving" },
  },
  {
    kind: "event",
    event: {
      t: 117,
      type: "csr.approved",
      id: "csr-worker-0-serving",
      by: "machine-approver",
      actor: "installer",
      contrastNote: CSR_AUTO_APPROVE_NOTE_SERVING,
    },
  },
  {
    kind: "event",
    event: {
      t: 118,
      type: "csr.approved",
      id: "csr-worker-1-serving",
      by: "machine-approver",
      actor: "installer",
      contrastNote: CSR_AUTO_APPROVE_NOTE_SERVING,
    },
  },
  { kind: "event", event: { t: 120, type: "vm.reboot", node: "worker-0", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 120.5, type: "vm.reboot", node: "worker-1", reason: "mcd-pivot" } },
  { kind: "event", event: { t: 122, type: "node.ready", node: "worker-0", ready: true } },
  { kind: "event", event: { t: 123, type: "node.ready", node: "worker-1", ready: true } },

  { kind: "event", event: { t: 130, type: "co.status", name: "etcd", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 131, type: "co.status", name: "kube-apiserver", available: true, progressing: false, degraded: false },
  },
  { kind: "event", event: { t: 140, type: "co.status", name: "network", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 145, type: "co.status", name: "dns", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 150, type: "co.status", name: "ingress", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 155, type: "co.status", name: "authentication", available: true, progressing: false, degraded: false },
  },
  { kind: "event", event: { t: 160, type: "co.status", name: "console", available: true, progressing: false, degraded: false } },
  {
    kind: "event",
    event: { t: 165, type: "co.status", name: "image-registry", available: false, progressing: false, degraded: false },
  },

  { kind: "chapter", title: "Install complete" },
  { kind: "event", event: { t: 180, type: "install.complete" } },
];

export const ipiBaremetal: Scenario = {
  id: "ipi-baremetal",
  title: "IPI bare metal",
  mode: "ipi-baremetal",
  topology: {
    nodes: [
      { id: "provisioning", role: "provisioning", label: "Provisioning host", zone: "provisioning" },
      { id: "bootstrap", role: "bootstrap", label: "Bootstrap (Ironic)", zone: "provisioning" },
      { id: "master-0", role: "master", label: "master-0" },
      { id: "master-1", role: "master", label: "master-1" },
      { id: "master-2", role: "master", label: "master-2" },
      { id: "worker-0", role: "worker", label: "worker-0" },
      { id: "worker-1", role: "worker", label: "worker-1" },
    ],
    links: [
      { source: "provisioning", target: "bootstrap" },
      { source: "provisioning", target: "master-0" },
      { source: "provisioning", target: "master-1" },
      { source: "provisioning", target: "master-2" },
      { source: "provisioning", target: "worker-0" },
      { source: "provisioning", target: "worker-1" },
    ],
  },
  initialState: {
    dns: {
      [`api.${CLUSTER}.${BASE_DOMAIN}`]: API_VIP,
      [`api-int.${CLUSTER}.${BASE_DOMAIN}`]: API_VIP,
      [`*.apps.${CLUSTER}.${BASE_DOMAIN}`]: INGRESS_VIP,
    },
    // No lb state: there's no external load balancer in bare-metal IPI. VIPs are
    // provided on-cluster by keepalived/haproxy, not modeled as an lb.backend-tracked node.
  },
  steps,
  artifacts: buildIpiBaremetalArtifacts({
    cluster: CLUSTER,
    baseDomain: BASE_DOMAIN,
    apiVip: API_VIP,
    ingressVip: INGRESS_VIP,
    bmc: BMC,
    clusterId: "9d3f1a20-7e5c-4b9d-8a2e-1f6c4d8b3e90",
    infraId: `${CLUSTER}-8k3rn`,
  }),
};
