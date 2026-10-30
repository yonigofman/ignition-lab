import type { Scenario, ScenarioStep } from "../engine/scenario";

const MASTERS = ["master-0", "master-1", "master-2"];
const WORKERS = ["worker-0", "worker-1"];
const CURRENT_VERSION = "4.14.10";
const DESIRED_VERSION = "4.15.3";

function rollNode(node: string, startT: number): ScenarioStep[] {
  return [
    { kind: "event", event: { t: startT, type: "node.schedulable", node, schedulable: false } },
    { kind: "event", event: { t: startT + 2, type: "vm.reboot", node, reason: "mcd-pivot" } },
    { kind: "event", event: { t: startT + 4, type: "node.schedulable", node, schedulable: true } },
    { kind: "event", event: { t: startT + 6, type: "node.ready", node, ready: true } },
  ];
}

const steps: ScenarioStep[] = [
  { kind: "chapter", title: "Upgrade requested" },
  {
    kind: "gate",
    gateId: "start-upgrade",
    prompt: `This cluster is healthy on ${CURRENT_VERSION}. Start the upgrade to ${DESIRED_VERSION}.`,
    hint: `Run \`oc adm upgrade --to=${DESIRED_VERSION}\` in the terminal.`,
    check: (s) => s.clusterVersion.progressing === true,
  },

  { kind: "chapter", title: "Control plane operators update" },
  { kind: "event", event: { t: 10, type: "co.status", name: "etcd", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 12, type: "co.status", name: "etcd", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 14, type: "co.status", name: "kube-apiserver", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 18, type: "co.status", name: "kube-apiserver", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 20, type: "co.status", name: "kube-controller-manager", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 24, type: "co.status", name: "kube-controller-manager", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 26, type: "co.status", name: "kube-scheduler", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 28, type: "co.status", name: "kube-scheduler", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 30, type: "co.status", name: "openshift-apiserver", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 33, type: "co.status", name: "openshift-apiserver", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 35, type: "co.status", name: "network", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 38, type: "co.status", name: "network", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 40, type: "co.status", name: "dns", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 42, type: "co.status", name: "dns", available: true, progressing: false, degraded: false } },
  // machine-config stays `progressing` for the whole node rollout below - it's the
  // operator actually driving it, not just reporting a quick version bump like the others.
  { kind: "event", event: { t: 44, type: "co.status", name: "machine-config", available: true, progressing: true, degraded: false } },

  { kind: "chapter", title: "Masters roll, one at a time" },
  ...rollNode("master-0", 50),
  ...rollNode("master-1", 58),
  ...rollNode("master-2", 66),

  { kind: "chapter", title: "Workers roll, one at a time" },
  ...rollNode("worker-0", 80),
  ...rollNode("worker-1", 90),
  { kind: "event", event: { t: 98, type: "co.status", name: "machine-config", available: true, progressing: false, degraded: false } },

  { kind: "chapter", title: "Remaining operators converge" },
  { kind: "event", event: { t: 100, type: "co.status", name: "ingress", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 102, type: "co.status", name: "ingress", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 104, type: "co.status", name: "authentication", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 106, type: "co.status", name: "authentication", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 108, type: "co.status", name: "console", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 110, type: "co.status", name: "console", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 112, type: "co.status", name: "monitoring", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 115, type: "co.status", name: "monitoring", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 116, type: "co.status", name: "operator-lifecycle-manager", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 118, type: "co.status", name: "operator-lifecycle-manager", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 120, type: "co.status", name: "service-ca", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 122, type: "co.status", name: "service-ca", available: true, progressing: false, degraded: false } },
  { kind: "event", event: { t: 124, type: "co.status", name: "storage", available: true, progressing: true, degraded: false } },
  { kind: "event", event: { t: 126, type: "co.status", name: "storage", available: true, progressing: false, degraded: false } },

  { kind: "chapter", title: "Upgrade complete" },
  { kind: "event", event: { t: 130, type: "clusterversion.update_complete" } },
];

export const upgrade3m2w: Scenario = {
  id: "upgrade-3m-2w",
  title: `OpenShift upgrade (${CURRENT_VERSION} → ${DESIRED_VERSION})`,
  mode: "upi",
  topology: {
    nodes: [
      { id: "master-0", role: "master", label: "master-0" },
      { id: "master-1", role: "master", label: "master-1" },
      { id: "master-2", role: "master", label: "master-2" },
      { id: "worker-0", role: "worker", label: "worker-0" },
      { id: "worker-1", role: "worker", label: "worker-1" },
    ],
    links: [
      { source: "master-0", target: "master-1" },
      { source: "master-1", target: "master-2" },
      { source: "master-0", target: "master-2" },
      { source: "master-0", target: "worker-0" },
      { source: "master-0", target: "worker-1" },
    ],
  },
  initialState: {
    phase: "complete",
    clusterVersion: { current: CURRENT_VERSION, desired: CURRENT_VERSION, progressing: false },
    etcdMembers: [...MASTERS],
    nodes: Object.fromEntries(
      [...MASTERS, ...WORKERS].map((id, i) => [
        id,
        {
          id,
          role: (MASTERS.includes(id) ? "master" : "worker") as "master" | "worker",
          power: "on" as const,
          phase: "ready" as const,
          rebootCount: 1,
          ready: true,
          schedulable: true,
          registeredAt: 0,
          ip: `192.168.1.${21 + i}`,
        },
      ])
    ),
    clusterOperators: {
      ...Object.fromEntries(
        [
          "etcd",
          "kube-apiserver",
          "kube-controller-manager",
          "kube-scheduler",
          "openshift-apiserver",
          "network",
          "dns",
          "ingress",
          "authentication",
          "console",
          "machine-config",
          "monitoring",
          "operator-lifecycle-manager",
          "service-ca",
          "storage",
        ].map((name) => [name, { name, available: true, progressing: false, degraded: false, since: 0 }])
      ),
      // Still Removed/unavailable from before the upgrade (no storage configured - the
      // same gotcha the UPI/IPI install scenarios teach) and never touched by this
      // scenario's steps: an upgrade doesn't fix a missing storage config.
      "image-registry": { name: "image-registry", available: false, progressing: false, degraded: false, since: 0 },
    },
  },
  steps,
  artifacts: [],
};
