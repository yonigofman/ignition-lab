# AGENTS.md — OpenShift Install Lab (Simulator)

## What we're building

An **interactive, browser-only course** that teaches how OpenShift gets installed (UPI and IPI) by
**visualizing the install as it happens**: an animated architecture topology, a timeline you can
scrub, a scripted terminal, and lessons that pause at key moments and ask the learner to act or predict.

It doubles as a **polished architecture demo**: someone with no cluster and no hardware should be able
to open the site, press play, and understand the bootstrap process in five minutes.

### Scope of this repo (phase 1)

- **In scope:** the simulator engine, scenarios, visualization, scripted terminal, lessons, break-it scenarios.
- **Out of scope (later phases, don't build now, but don't block them):**
  - Replay of recorded real installs
  - Live lab mode (collectors streaming events from a real libvirt/OKD install over WebSocket)
- There is **no backend**. Everything runs client-side and deploys as a static site.

### The one architectural rule

**The UI is a pure function of an event stream.**

```
EventSource (simulator | replay | live)  →  InstallEvent[]  →  reduce()  →  ClusterSnapshot  →  UI
```

- Every engine emits the same `InstallEvent` type. The UI never knows which engine is running.
- `ClusterSnapshot` is derived by a **pure reducer** over events up to time `t`. No UI component
  mutates cluster state directly.
- Seeking = re-reduce from `t=0` to the target time. Keep the reducer fast enough that this is fine
  (scenarios are hundreds of events, not millions).
- Learner actions (approve a CSR, fix a DNS record) are dispatched as events too
  (`learner.*`), so they flow through the same reducer and can be recorded.

If you're about to put cluster logic in a React component, stop and put it in the reducer.

---

## Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + React + TypeScript (`strict: true`) |
| Topology canvas | `@xyflow/react` (React Flow) with custom nodes and animated edges |
| Phase/state machine | XState v5 (install phases, gating, learner checkpoints) |
| Animation | `motion` (Framer Motion) for node state changes and packet-flow on edges |
| Terminal | `@xterm/xterm` with a scripted command layer (no real shell) |
| Lessons | MDX (`@mdx-js/rollup`) so lessons can embed interactive components |
| Styling | Tailwind CSS, dark-first design, light mode supported |
| Tests | Vitest (engine/reducer/commands), Playwright (one smoke test per scenario) |
| Lint/format | ESLint + Prettier |

Use pnpm. Pin major versions in `package.json`.

---

## Directory layout

```
src/
  engine/
    events.ts            # InstallEvent union type + schema version
    snapshot.ts          # ClusterSnapshot type
    reducer.ts           # reduce(snapshot, event) -> snapshot   (PURE)
    clock.ts             # play / pause / speed / seek
    sources/
      EventSource.ts     # interface implemented by all engines
      SimulatorSource.ts # plays a Scenario, handles gates and fault injection
    machine.ts           # XState machine for install phases + gates
  scenarios/
    upi-compact-3node.ts
    ipi-baremetal.ts
    faults/              # break-it variants (see below)
  terminal/
    commands/            # one file per command: oc.ts, dig.ts, openshift-install.ts, ...
    registry.ts
  ui/
    topology/            # React Flow canvas, custom node types, edge animations
    timeline/            # scrubber with phase markers and event ticks
    inspector/           # side panel for the selected node
    terminal/            # xterm wrapper
    lesson/              # lesson runner, prediction prompts, checkpoints
  lessons/               # .mdx files, one per module
  app/                   # routes, layout, scenario picker
tests/
```

---

## Event model

Version the schema from day one; replay/live engines will depend on it.

```ts
export const EVENT_SCHEMA_VERSION = 1;

type NodeId = string; // "helper", "lb", "bootstrap", "master-0", "worker-0", ...

interface BaseEvent {
  t: number;          // seconds since install start
  type: string;
  node?: NodeId;
  msg?: string;       // human-readable line for the event log
}

export type InstallEvent =
  // infrastructure
  | BaseEvent & { type: "vm.power"; node: NodeId; state: "on" | "off" }
  | BaseEvent & { type: "vm.reboot"; node: NodeId; reason: "install-to-disk" | "mcd-pivot" | "other" }
  | BaseEvent & { type: "dhcp.lease"; node: NodeId; ip: string }
  | BaseEvent & { type: "dns.query"; from: NodeId; name: string; result: "ok" | "nxdomain" }
  | BaseEvent & { type: "lb.backend"; frontend: 6443 | 22623 | 80 | 443; backend: NodeId; state: "up" | "down" | "removed" }
  | BaseEvent & { type: "bmc.power"; node: NodeId; protocol: "redfish" | "ipmi"; action: "on" | "off" | "reset" }
  // ignition
  | BaseEvent & { type: "ignition.fetched"; node: NodeId; file: "bootstrap.ign" | "master.ign" | "worker.ign"; from: NodeId; via?: NodeId }
  | BaseEvent & { type: "ignition.mcs_served"; node: NodeId; pool: "master" | "worker"; from: NodeId; via?: NodeId }
  | BaseEvent & { type: "ignition.failed"; node: NodeId; reason: string }
  // bootstrap / control plane
  | BaseEvent & { type: "bootstrap.temp_control_plane_up" }
  | BaseEvent & { type: "etcd.member_joined"; node: NodeId }
  | BaseEvent & { type: "controlplane.pod_scheduled"; node: NodeId; component: "kube-apiserver" | "kube-controller-manager" | "kube-scheduler" | "etcd" }
  | BaseEvent & { type: "cvo.started" }
  | BaseEvent & { type: "bootstrap.complete" }
  | BaseEvent & { type: "bootstrap.removed" }
  // nodes & CSRs
  | BaseEvent & { type: "node.registered"; node: NodeId; role: "master" | "worker" }
  | BaseEvent & { type: "node.ready"; node: NodeId; ready: boolean }
  | BaseEvent & { type: "csr.created"; id: string; node: NodeId; kind: "client" | "serving" }
  | BaseEvent & { type: "csr.approved"; id: string; by: "auto" | "learner" | "machine-approver" }
  // operators
  | BaseEvent & { type: "co.status"; name: string; available: boolean; progressing: boolean; degraded: boolean }
  | BaseEvent & { type: "install.complete" }
  | BaseEvent & { type: "install.failed"; reason: string }
  // learner + lesson
  | BaseEvent & { type: "learner.action"; action: string; payload?: unknown }
  | BaseEvent & { type: "lesson.gate"; gateId: string; state: "waiting" | "passed" };
```

`ClusterSnapshot` holds, at minimum: per-node `{ power, ip, phase, rebootCount, role, ready }`, DNS
records, LB backend states per frontend, etcd members, CSR list, ClusterOperator statuses, the
current install phase, and an append-only log of rendered event lines.

Edges in the topology are **derived from events** (e.g. `ignition.mcs_served` with `via: "lb"` animates
`master-0 → lb → bootstrap:22623`). Never hardcode an animation in the UI that isn't backed by an event.

---

## Scenario format

```ts
interface Scenario {
  id: string;
  title: string;
  mode: "upi" | "ipi-baremetal";
  topology: { nodes: TopologyNode[]; links: TopologyLink[] };
  initialState: Partial<ClusterSnapshot>;  // e.g. DNS records, LB config before install
  steps: ScenarioStep[];
}

type ScenarioStep =
  | { kind: "event"; event: InstallEvent }
  | { kind: "gate"; gateId: string; prompt: string; check: (s: ClusterSnapshot) => boolean; hint?: string }
  | { kind: "predict"; question: string; options: string[]; answer: number; explain: string }
  | { kind: "chapter"; title: string; lesson?: string }; // marks phase boundaries on the timeline
```

- `gate` pauses the clock until `check(snapshot)` is true (usually after a learner action in the terminal).
- `predict` pauses and asks "what happens next?" before revealing the following events.
- Fault variants are produced by a function `applyFault(scenario, fault) → Scenario` that rewrites
  steps (drops, delays, or replaces events), never by forking scenario files.

---

## Domain reference (keep the simulation accurate)

The simulation must be faithful to how OpenShift 4.x actually installs. When unsure, check the
official OpenShift docs ("Installation process" / "bootstrap process") and OKD docs.

### UPI prerequisites (the learner owns these)

- **DNS:**
  - `api.<cluster>.<base>` → API load balancer (external)
  - `api-int.<cluster>.<base>` → API load balancer (internal), used by nodes
  - `*.apps.<cluster>.<base>` → ingress load balancer
  - A/PTR records for every node (bootstrap, masters, workers)
- **Load balancers:**
  - API LB: `6443` (Kubernetes API) and `22623` (Machine Config Server, internal only).
    Backends: bootstrap + all masters during install; bootstrap removed afterwards.
  - Ingress LB: `80` and `443` → nodes running the router (workers, or masters in a compact cluster).
- **Helper/bastion:** DHCP/PXE (or ISO), HTTP server hosting ignition files, DNS, HAProxy.

### Artifacts

1. `install-config.yaml` (learner writes it in UPI; `platform: none` for generic UPI).
2. `openshift-install create manifests` — for a compact cluster, masters are schedulable.
3. `openshift-install create ignition-configs` → `bootstrap.ign`, `master.ign`, `worker.ign`,
   `metadata.json`, `auth/kubeconfig`, `auth/kubeadmin-password`.
   - `master.ign` / `worker.ign` are small **pointer configs** to `https://api-int.<cluster>.<base>:22623/config/{master,worker}`.
   - `bootstrap.ign` is large and served from the helper's HTTP server.
   - The certificates embedded in ignition expire after **24 hours**; the install must happen within that window.

### Node boot

RHCOS/FCOS boots from PXE or ISO with kernel args like `coreos.inst.install_dev` and
`coreos.inst.ignition_url`, writes the OS to disk, and reboots (`vm.reboot reason: install-to-disk`).
On first boot it applies ignition. Masters and workers later reboot again when the machine-config
daemon moves them to the release's OS image (`reason: mcd-pivot`).

### The bootstrap process (the centerpiece — get the order right)

1. Bootstrap machine boots and starts serving what the control plane machines need, including the
   **Machine Config Server on 22623**.
2. Bootstrap starts a **single-member etcd** and a **temporary Kubernetes control plane**.
3. Masters boot, fetch their pointer ignition, then pull the full config from the MCS **through the
   API load balancer (`api-int:22623`)**.
4. The temporary control plane schedules the **production control plane** onto the masters.
5. The **Cluster Version Operator (CVO)** comes up and installs the etcd operator, which scales etcd
   across the masters.
6. The temporary control plane hands over to the production control plane.
7. Bootstrap injects the remaining OpenShift components into the production control plane.
8. `openshift-install wait-for bootstrap-complete` reports that it's safe to remove the bootstrap.
   - **UPI:** the learner removes bootstrap from the LB backends and destroys it.
   - **IPI:** the installer destroys it automatically.
9. Compute nodes join; the control plane installs the rest of the platform as operators.
10. `openshift-install wait-for install-complete` returns once ClusterOperators are Available.

Master CSRs are approved automatically during bootstrap. **In UPI, worker CSRs need manual approval**:
first the client CSR (`kubernetes.io/kube-apiserver-client-kubelet`), then, after the kubelet starts,
the serving CSR (`kubernetes.io/kubelet-serving`). In IPI, the machine-approver handles CSRs for
Machines it created.

### ClusterOperators

Simulate a realistic set converging over time (not all at once). Include at least: `etcd`,
`kube-apiserver`, `kube-controller-manager`, `kube-scheduler`, `openshift-apiserver`,
`network`, `dns`, `ingress`, `authentication`, `console`, `machine-config`, `monitoring`,
`image-registry`, `operator-lifecycle-manager`, `service-ca`, `storage`.
Dependencies matter: `authentication` and `console` need `ingress` and working `*.apps` DNS.

### IPI bare metal (second scenario)

- Install-config lists hosts under `platform.baremetal.hosts` with BMC addresses (Redfish/IPMI)
  and boot MACs, plus API and ingress VIPs.
- No external LB: VIPs are provided on-cluster (keepalived + haproxy).
- A **provisioning host** runs the installer; the bootstrap VM runs on it and hosts **Ironic**.
- Ironic powers hosts on via the BMC (`bmc.power` events), boots them over the provisioning network
  or virtual media, and deploys RHCOS.
- After bootstrap completes, provisioning moves into the cluster (metal3), and hosts appear as
  `BareMetalHost` resources.
- Visual contrast with UPI is a key teaching point: show a "who does this?" toggle (learner vs installer).

### Image registry gotcha

On UPI/bare metal with no storage configured, the `image-registry` operator starts with
`managementState: Removed`. Surface this in the lesson; it's a classic "why can't I push images?" moment.

---

## Scenarios to ship in phase 1

1. **`upi-compact-3node`** (MVP): helper, LB, bootstrap, 3 schedulable masters, no workers.
2. **`upi-3m-2w`**: adds 2 workers to teach CSR approval.
3. **`ipi-baremetal`**: provisioning host, bootstrap VM with Ironic, 3 masters, 2 workers, BMCs.

### Break-it variants (`scenarios/faults/`)

Each fault must produce **observable symptoms** in the timeline, topology, and terminal, and the
learner must diagnose and fix it via the terminal to pass the gate.

| Fault | Symptom | Fix |
|---|---|---|
| Missing `api-int` record | masters loop on `ignition.failed`, `dns.query` → nxdomain | add the record |
| 22623 backend points to the wrong host | masters can't fetch MCS config | fix the LB backend |
| Missing `*.apps` wildcard | `ingress` OK but `authentication`/`console` Degraded | add the wildcard |
| Ignition older than 24h | TLS errors fetching config | regenerate ignition configs |
| Worker CSRs not approved | workers stuck `NotReady`, `oc get csr` shows Pending | `oc adm certificate approve` (twice) |
| Bootstrap left in LB | install completes but API LB has a dead backend | remove bootstrap from LB |

---

## Terminal

A scripted shell, not a real one. Each command is a function of the current `ClusterSnapshot`, so
output is always consistent with what the topology shows.

```ts
type Command = (args: string[], s: ClusterSnapshot) => { output: string; dispatch?: InstallEvent[] };
```

Support at least:

- `openshift-install wait-for bootstrap-complete --log-level=info`
- `openshift-install wait-for install-complete`
- `oc get nodes`, `oc get csr`, `oc get co`, `oc get clusterversion`
- `oc adm certificate approve <name>` (dispatches `csr.approved` with `by: "learner"`)
- `dig api-int.<cluster>.<base>` and `dig test.apps.<cluster>.<base>`
- `curl -k https://api-int.<cluster>.<base>:22623/config/master` (succeeds only when MCS is reachable)
- `ssh core@bootstrap` followed by `journalctl -b -f -u release-image.service -u bootkube.service`
- Lab helpers for fixes: `lab dns add|rm`, `lab lb set|rm` (clearly marked as lab commands, not real tools)
- `help` (lists commands available in the current lesson)

Output formats must look like real `oc` output (column alignment, AGE columns derived from `t`).
Unknown commands print a short, friendly error with the closest match.

---

## UI

- **Layout:** topology canvas in the center, timeline along the bottom, collapsible inspector on the
  right, lesson panel on the left, terminal as a drawer.
- **Topology:**
  - Nodes visibly change state: off → booting → installing → ready, with reboot animations.
  - The bootstrap node visibly hands over and fades out after `bootstrap.removed`.
  - Packet-flow animations on edges for ignition fetches, MCS traffic, BMC calls, and DNS queries.
  - An etcd ring visual on the masters showing members joining (1 → 3).
  - Network zones (helper/infra, cluster network, provisioning network for IPI) as grouped regions.
- **Timeline:** play/pause, speed (0.5×–10×), seek, chapter markers, event ticks colored by category,
  red markers for failures.
- **Inspector:** clicking a node shows role, IP, phase, reboot count, the ignition file it consumed,
  recent events for that node, and "commands you'd run here".
- **Lessons:** MDX; can embed `<PlayUntil chapter="..."/>`, `<Predict/>`, `<Gate/>`, `<HighlightNode id="..."/>`.
- **Demo mode:** a single button that hides the lesson panel and plays the default scenario
  end-to-end with captions. This is the "show it to someone in five minutes" path.
- **Visual quality matters.** This is a showcase. Use a coherent color system (one color per
  traffic category), smooth easing, and good typography. Respect `prefers-reduced-motion`.
- Must work at laptop widths; a read-only demo view must work on mobile.

---

## Lessons (modules)

0. Concepts — IPI vs UPI, RHCOS, ignition, release payload, CVO, operators
1. UPI prerequisites — DNS, LBs, helper services (checkpoint: `dig` and LB checks pass)
2. From install-config to ignition — what each artifact is and who consumes it
3. The bootstrap dance — the full sequence above, with predictions at each handover
4. Workers and CSRs — manual approval, client vs serving
5. Convergence — ClusterOperators, CVO, what "install complete" actually means
6. IPI — same story, automated; bare metal with Ironic and BMCs
7. Break-it — the fault scenarios

---

## Milestones and acceptance criteria

**M1 — Engine:** event types, reducer, clock, `SimulatorSource`. Reducer is fully unit-tested;
seeking to any `t` yields the same snapshot as playing to `t`.

**M2 — Topology + timeline:** `upi-compact-3node` plays end to end with animated nodes and edges.
No lessons yet.

**M3 — Terminal:** all listed commands, output consistent with the snapshot at any time.

**M4 — Lessons + gates:** modules 0–3 with predict prompts and at least one gate.

**M5 — Workers & faults:** `upi-3m-2w`, CSR gate, the fault variants.

**M6 — IPI bare metal** scenario and the "who does this?" toggle.

**M7 — Demo mode + polish**, Playwright smoke tests, static deploy (GitHub Pages or similar).

Work milestone by milestone. Don't start UI polish before M3.

---

## Conventions

- TypeScript `strict`; no `any` in `engine/`.
- `engine/` has **no React imports**. It must be usable from Node (future replay/live engines).
- Reducer and command functions are pure and deterministic; randomness (jitter in timings) is
  seeded per scenario.
- Every new event type needs: a reducer case, a log-line renderer, and a test.
- Every fault needs a test that asserts the symptom appears and the fix clears it.
- Keep files small; one React component per file.
- Commit messages: Conventional Commits.
- Run `pnpm lint && pnpm test` before declaring a task done.

## Don't

- Don't add a backend, auth, or database.
- Don't let UI components invent cluster state that isn't in the snapshot.
- Don't simplify the bootstrap order for convenience; accuracy is the point of the project.
- Don't use real Red Hat logos or branding; use neutral icons and our own visual identity.