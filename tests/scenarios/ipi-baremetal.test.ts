import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { ipiBaremetal } from "../../src/scenarios/ipi-baremetal";
import { deriveTopologyView } from "../../src/ui/topology/deriveTopologyView";

describe("ipi-baremetal > playback", () => {
  it("never blocks on a gate or predict - everything here is automated", () => {
    const source = new SimulatorSource(ipiBaremetal);
    expect(source.getBlockingStep()).toBeNull();
    expect(source.getEvents().length).toBe(
      ipiBaremetal.steps.filter((s) => s.kind === "event").length
    );
  });

  it("reaches install.complete with every node ready and no CSR left pending", () => {
    const source = new SimulatorSource(ipiBaremetal);
    const events = source.getEvents();
    const final = reduceAll(events, Infinity, createInitialSnapshot(ipiBaremetal.initialState));

    expect(final.phase).toBe("complete");
    for (const id of ["master-0", "master-1", "master-2", "worker-0", "worker-1"]) {
      expect(final.nodes[id]?.ready, `expected ${id} to be ready`).toBe(true);
    }
    expect(final.csrs.length).toBeGreaterThan(0);
    expect(final.csrs.every((c) => c.status === "approved")).toBe(true);
  });
});

describe("ipi-baremetal > who provisions and approves", () => {
  const source = new SimulatorSource(ipiBaremetal);
  const events = source.getEvents();

  it("powers every master and worker on over BMC, never vm.power", () => {
    for (const id of ["master-0", "master-1", "master-2", "worker-0", "worker-1"]) {
      expect(events.some((e) => e.type === "bmc.power" && e.node === id && e.action === "on")).toBe(true);
      expect(events.some((e) => e.type === "vm.power" && e.node === id)).toBe(false);
    }
  });

  it("approves every CSR via the machine-approver, never auto or learner", () => {
    const approvals = events.filter((e) => e.type === "csr.approved");
    expect(approvals.length).toBeGreaterThan(0);
    expect(approvals.every((e) => e.type === "csr.approved" && e.by === "machine-approver")).toBe(true);
  });

  it("removes bootstrap automatically with no learner gate, tagged as an installer-done contrast moment", () => {
    const removed = events.find((e) => e.type === "bootstrap.removed");
    expect(removed).toBeDefined();
    expect(removed?.actor).toBe("installer");
    expect(removed?.contrastNote).toBeTruthy();
  });

  it("tags the worker CSR auto-approvals as installer contrast moments too", () => {
    const workerApprovals = events.filter(
      (e) => e.type === "csr.approved" && e.id.startsWith("csr-worker-")
    );
    expect(workerApprovals.length).toBeGreaterThan(0);
    expect(workerApprovals.every((e) => e.actor === "installer" && Boolean(e.contrastNote))).toBe(true);
  });

  it("leaves master CSR approvals untagged - approving masters automatically isn't a UPI/IPI contrast point", () => {
    const masterApprovals = events.filter(
      (e) => e.type === "csr.approved" && e.id.startsWith("csr-master-")
    );
    expect(masterApprovals.length).toBeGreaterThan(0);
    expect(masterApprovals.every((e) => e.contrastNote === undefined)).toBe(true);
  });
});

describe("ipi-baremetal > topology", () => {
  it("groups the provisioning host and bootstrap into the provisioning zone, masters/workers into cluster", () => {
    const source = new SimulatorSource(ipiBaremetal);
    const events = source.getEvents();
    const snapshot = reduceAll(events, 0, createInitialSnapshot(ipiBaremetal.initialState));
    const view = deriveTopologyView(snapshot, ipiBaremetal.topology, events);

    expect(view.nodes.find((n) => n.id === "provisioning")?.zone).toBe("provisioning");
    expect(view.nodes.find((n) => n.id === "bootstrap")?.zone).toBe("provisioning");
    expect(view.nodes.find((n) => n.id === "master-0")?.zone).toBe("cluster");
    expect(view.nodes.find((n) => n.id === "worker-0")?.zone).toBe("cluster");
  });

  it("has no helper or lb node - there's no external load balancer in IPI bare metal", () => {
    const ids = ipiBaremetal.topology.nodes.map((n) => n.id);
    expect(ids).not.toContain("helper");
    expect(ids).not.toContain("lb");
  });

  it("never emits lb.backend events or seeds lb state - VIPs are on-cluster, not an external LB", () => {
    const source = new SimulatorSource(ipiBaremetal);
    const events = source.getEvents();
    expect(events.some((e) => e.type === "lb.backend")).toBe(false);
    expect(ipiBaremetal.initialState.lb).toBeUndefined();
  });
});

describe("ipi-baremetal > convergence", () => {
  it("still ends with image-registry unavailable - the no-default-storage gotcha applies to bare metal too", () => {
    const source = new SimulatorSource(ipiBaremetal);
    const events = source.getEvents();
    const final = reduceAll(events, Infinity, createInitialSnapshot(ipiBaremetal.initialState));
    expect(final.clusterOperators["image-registry"]?.available).toBe(false);
  });
});
