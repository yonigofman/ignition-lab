import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { upgrade3m2w } from "../../src/scenarios/upgrade-3m-2w";
import { fullEventsFor } from "../helpers/fullScenarioEvents";

describe("upgrade-3m-2w > the upgrade-start gate", () => {
  it("blocks from t=0 and has no autoResolve - nothing but a learner can start an upgrade", () => {
    const source = new SimulatorSource(upgrade3m2w);
    const blocking = source.getBlockingStep();
    expect(blocking).toMatchObject({ kind: "gate", gateId: "start-upgrade" });
    expect(blocking && blocking.kind === "gate" ? blocking.autoResolve : undefined).toBeUndefined();
    expect(source.getEvents()).toHaveLength(0);
  });

  it("clears once clusterversion.update_started is dispatched", () => {
    const source = new SimulatorSource(upgrade3m2w);
    source.dispatch({ t: 0, type: "clusterversion.update_started", desired: "4.15.3" });
    expect(source.getBlockingStep()).toBeNull();
  });
});

describe("upgrade-3m-2w > rollout ordering", () => {
  const events = fullEventsFor(upgrade3m2w);

  function rebootsOf(node: string) {
    return events.filter((e) => e.type === "vm.reboot" && e.node === node);
  }

  it("never has two masters mid-rollout (cordoned or post-reboot-not-ready) at the same time", () => {
    const final = reduceAll(events, Infinity, createInitialSnapshot(upgrade3m2w.initialState));
    expect(final.phase).toBe("complete");

    // Reconstruct, at every event's t, how many masters are "mid-rollout".
    const sorted = [...events].sort((a, b) => a.t - b.t);
    for (const e of sorted) {
      const snap = reduceAll(events, e.t, createInitialSnapshot(upgrade3m2w.initialState));
      const midRollout = ["master-0", "master-1", "master-2"].filter((id) => {
        const n = snap.nodes[id];
        return n && (n.schedulable === false || (n.lastRebootReason === "mcd-pivot" && !n.ready));
      });
      expect(midRollout.length, `more than one master mid-rollout at t=${e.t}: ${midRollout.join(",")}`).toBeLessThanOrEqual(1);
    }
  });

  it("reboots every master and worker exactly once for the upgrade", () => {
    for (const node of ["master-0", "master-1", "master-2", "worker-0", "worker-1"]) {
      expect(rebootsOf(node)).toHaveLength(1);
      expect(rebootsOf(node)[0]).toMatchObject({ reason: "mcd-pivot" });
    }
  });

  it("never starts a worker's rollout before every master has finished", () => {
    const lastMasterReadyT = Math.max(
      ...events
        .filter((e) => e.type === "node.ready" && ["master-0", "master-1", "master-2"].includes(e.node ?? ""))
        .map((e) => e.t)
    );
    const firstWorkerRollEventT = Math.min(
      ...events
        .filter((e) => e.type === "node.schedulable" && ["worker-0", "worker-1"].includes(e.node ?? ""))
        .map((e) => e.t)
    );
    expect(firstWorkerRollEventT).toBeGreaterThan(lastMasterReadyT);
  });
});

describe("upgrade-3m-2w > final state", () => {
  it("ends with clusterVersion fully moved to the desired version", () => {
    const events = fullEventsFor(upgrade3m2w);
    const final = reduceAll(events, Infinity, createInitialSnapshot(upgrade3m2w.initialState));
    expect(final.clusterVersion).toEqual({ current: "4.15.3", desired: "4.15.3", progressing: false });
  });

  it("every master and worker is ready and schedulable at the end", () => {
    const events = fullEventsFor(upgrade3m2w);
    const final = reduceAll(events, Infinity, createInitialSnapshot(upgrade3m2w.initialState));
    for (const id of ["master-0", "master-1", "master-2", "worker-0", "worker-1"]) {
      expect(final.nodes[id]).toMatchObject({ ready: true, schedulable: true });
    }
  });

  it("image-registry stays unavailable - an upgrade doesn't fix a missing storage config", () => {
    const events = fullEventsFor(upgrade3m2w);
    const final = reduceAll(events, Infinity, createInitialSnapshot(upgrade3m2w.initialState));
    expect(final.clusterOperators["image-registry"]?.available).toBe(false);
  });
});

describe("upgrade-3m-2w > topology", () => {
  it("has no helper, bootstrap, or lb node - all of that is gone post-install", () => {
    const ids = upgrade3m2w.topology.nodes.map((n) => n.id);
    expect(ids).not.toContain("helper");
    expect(ids).not.toContain("bootstrap");
    expect(ids).not.toContain("lb");
  });
});
