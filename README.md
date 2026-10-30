# Ignition

**An interactive, browser-only simulator that shows how OpenShift actually installs and upgrades —
animated, scrubbable, and accurate.**

No cluster. No hardware. No backend. Open it, press play, and watch the bootstrap dance, a worker CSR
approval gate, an IPI bare-metal install with Ironic, or a control-plane-first rolling upgrade unfold
as an animated topology with a live event log underneath it.

**[Live demo →](https://yonigofman.github.io/ignition-lab/)**

## What's in it

- **UPI compact (3 master)** and **UPI (3 master + 2 worker)** — the full bootstrap dance: helper, load
  balancer, bootstrap, masters, CSR approval gates, ClusterOperator convergence.
- **IPI bare metal** — the same story, automated: Ironic, BMC power events, machine-approver CSRs, no
  gates. A "who does this?" toggle calls out exactly where IPI silently skips a step UPI makes you do
  by hand.
- **An upgrade scenario** — a healthy, already-installed cluster. A learner-gated
  `oc adm upgrade --to=<version>` kicks off a realistic rollout: control-plane operators first, then
  masters cordoned/drained/rebooted one at a time to protect etcd quorum, then workers, never more
  than one node mid-rollout.
- **Five break-it faults** — missing DNS records, a wrong load-balancer backend, an expired ignition
  config, unapproved worker CSRs, bootstrap left in the LB. Diagnose each one with the terminal and
  fix it to pass the gate.
- **A scripted terminal** — `oc get nodes/csr/co/clusterversion/mcp`, `oc adm certificate approve`,
  `oc adm upgrade`, `dig`, `curl`, `ssh`, `journalctl`, plus `lab` helpers for the fixes above. Output
  is derived live from simulator state, so it's always consistent with what's on screen.
- **A Files panel** — preview the artifacts a real install produces: `install-config.yaml`, generated
  manifests, `bootstrap.ign`/`master.ign`/`worker.ign`, `kubeconfig`, the lot.
- **Six lesson modules** — concepts, UPI prerequisites, install-config → ignition, the bootstrap dance,
  IPI, upgrades — with predict-what-happens-next checkpoints woven into playback.
- **Demo mode** — one button hides everything but the topology and plays the install start to finish
  with plain-language captions. The "show it to someone in five minutes" path.

## Why it's accurate

Every visual is driven by a typed event stream — `EventSource → InstallEvent[] → reduce() →
ClusterSnapshot → UI` — modeled directly on OpenShift's real install and upgrade mechanics: the
bootstrap machine's temporary control plane, pointer ignition configs fetched through the Machine
Config Server, master-first CSR auto-approval vs. manual worker approval, the 24-hour ignition
certificate window, and the image-registry-with-no-storage gotcha. Nothing on screen is scripted
separately from the data; the UI is a pure function of the event log underneath it.

## Running it locally

```bash
pnpm install
pnpm dev
```

Other scripts: `pnpm build`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright), `pnpm typecheck`,
`pnpm lint`.

## Stack

Vite + React + TypeScript, `@xyflow/react` for the topology canvas, Motion for animation, `@xterm/xterm`
for the terminal, MDX for lessons, Tailwind CSS. No backend — deploys as a static site to GitHub Pages.

See [`AGENTS.md`](./AGENTS.md) for the full architecture and domain reference.
