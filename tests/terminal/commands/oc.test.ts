import { describe, expect, it } from "vitest";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { upiCompact3Node } from "../../../src/scenarios/upi-compact-3node";
import { oc } from "../../../src/terminal/commands/oc";
import { fullEventsFor } from "../../helpers/fullScenarioEvents";

const events = fullEventsFor(upiCompact3Node);
function snapshotAt(t: number) {
  return reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));
}

describe("oc get nodes", () => {
  it("lists only registered master/worker nodes, never helper/lb/bootstrap", () => {
    const result = oc(["get", "nodes"], snapshotAt(80));
    expect(result.output).toContain("master-0");
    expect(result.output).not.toContain("helper");
    expect(result.output).not.toContain("bootstrap");
  });

  it("shows no nodes before any master has registered", () => {
    const result = oc(["get", "nodes"], snapshotAt(0));
    expect(result.output).toMatch(/no resources found/i);
  });

  it("shows STATUS Ready once a node is ready, NotReady before", () => {
    const before = oc(["get", "nodes"], snapshotAt(80));
    expect(before.output).toContain("NotReady");

    const after = oc(["get", "nodes"], snapshotAt(92));
    expect(after.output).toContain("Ready");
    expect(after.output).not.toContain("NotReady");
  });

  it("appends SchedulingDisabled to STATUS for a cordoned node", () => {
    const snapshot = createInitialSnapshot({
      nodes: {
        "master-0": { id: "master-0", role: "master", power: "on", phase: "ready", rebootCount: 1, ready: true, schedulable: false, registeredAt: 0 },
      },
    });
    const result = oc(["get", "nodes"], snapshot);
    expect(result.output).toContain("Ready,SchedulingDisabled");
  });
});

describe("oc get csr", () => {
  it("lists CSRs with PENDING/APPROVED condition", () => {
    const result = oc(["get", "csr"], snapshotAt(80));
    expect(result.output).toContain("csr-master-0-client");
    expect(result.output.toLowerCase()).toMatch(/approved|pending/);
  });

  it("prints no resources before any CSR exists", () => {
    const result = oc(["get", "csr"], snapshotAt(0));
    expect(result.output).toMatch(/no resources found/i);
  });
});

describe("oc get co", () => {
  it("lists ClusterOperators with AVAILABLE/PROGRESSING/DEGRADED", () => {
    const result = oc(["get", "co"], snapshotAt(100));
    expect(result.output).toContain("etcd");
    expect(result.output).toContain("True");
  });
});

describe("oc get clusterversion", () => {
  it("shows AVAILABLE once install completes", () => {
    const result = oc(["get", "clusterversion"], snapshotAt(150));
    expect(result.output).toContain("True");
  });

  it("does not show AVAILABLE before install completes", () => {
    const result = oc(["get", "clusterversion"], snapshotAt(0));
    expect(result.output).toContain("False");
  });

  it("keeps VERSION on the current version and AVAILABLE True while a rolling upgrade is in progress", () => {
    // The whole point of a rolling, one-node-at-a-time upgrade is that the cluster
    // keeps serving while it happens - AVAILABLE must not flip False just because
    // something is Progressing, and VERSION must not jump to desired early.
    const snapshot = createInitialSnapshot({
      clusterVersion: { current: "4.14.10", desired: "4.15.3", progressing: true },
    });
    const result = oc(["get", "clusterversion"], snapshot);
    const row = result.output.split("\n")[1]?.trim().split(/\s+/) ?? [];
    expect(row).toEqual(["version", "4.14.10", "True", "True", expect.any(String)]);
  });

  it("moves VERSION to the desired version once the upgrade completes", () => {
    const snapshot = createInitialSnapshot({
      clusterVersion: { current: "4.15.3", desired: "4.15.3", progressing: false },
    });
    const result = oc(["get", "clusterversion"], snapshot);
    expect(result.output).toContain("4.15.3");
    expect(result.output).not.toContain("4.14.10");
  });
});

describe("oc get mcp", () => {
  it("shows both pools UPDATED once every node in them is ready and schedulable", () => {
    const result = oc(["get", "mcp"], snapshotAt(150));
    expect(result.output).toContain("master");
    expect(result.output).toContain("UPDATED");
  });

  it("does not report a pool as updated just because its nodes are ready - they must have actually rolled", () => {
    // A node that's ready and schedulable but has never rebooted for this config
    // (e.g. an untouched worker before its turn in an upgrade's rolling update) is
    // still on the OLD config - "updated" must mean it actually rolled, not just "up".
    const snapshot = createInitialSnapshot({
      nodes: {
        "worker-0": { id: "worker-0", role: "worker", power: "on", phase: "ready", rebootCount: 1, ready: true, schedulable: true },
        "worker-1": { id: "worker-1", role: "worker", power: "on", phase: "ready", rebootCount: 1, ready: true, schedulable: true },
      },
    });
    const result = oc(["get", "mcp"], snapshot);
    const workerLine = result.output.split("\n").find((l) => l.startsWith("worker"));
    // UPDATED is the first column after the pool name.
    expect(workerLine?.trim().split(/\s+/)[1]).toBe("False");
  });

  it("shows UPDATING True for a pool with a cordoned node", () => {
    const snapshot = createInitialSnapshot({
      nodes: {
        "master-0": { id: "master-0", role: "master", power: "on", phase: "ready", rebootCount: 1, ready: true, schedulable: false },
        "master-1": { id: "master-1", role: "master", power: "on", phase: "ready", rebootCount: 0, ready: true, schedulable: true },
      },
    });
    const result = oc(["get", "mcp"], snapshot);
    const masterLine = result.output.split("\n").find((l) => l.startsWith("master"));
    expect(masterLine).toMatch(/True/);
  });
});

describe("oc adm upgrade", () => {
  it("reports no update in progress and the current version with no args", () => {
    const snapshot = createInitialSnapshot({
      clusterVersion: { current: "4.14.10", desired: "4.14.10", progressing: false },
    });
    const result = oc(["adm", "upgrade"], snapshot);
    expect(result.output).toContain("4.14.10");
    expect(result.output).not.toMatch(/error/i);
  });

  it("--to=<version> dispatches clusterversion.update_started paired with a learner.action", () => {
    const snapshot = createInitialSnapshot({
      clusterVersion: { current: "4.14.10", desired: "4.14.10", progressing: false },
    });
    const result = oc(["adm", "upgrade", "--to=4.15.3"], snapshot);
    expect(result.dispatch).toEqual([
      expect.objectContaining({ type: "learner.action", action: "oc.adm.upgrade" }),
      expect.objectContaining({ type: "clusterversion.update_started", desired: "4.15.3", actor: "learner" }),
    ]);
  });

  it("refuses to start a second upgrade while one is already in progress", () => {
    const snapshot = createInitialSnapshot({
      clusterVersion: { current: "4.14.10", desired: "4.15.3", progressing: true },
    });
    const result = oc(["adm", "upgrade", "--to=4.16.0"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/already in progress/i);
  });
});

describe("oc adm certificate approve", () => {
  it("dispatches csr.approved for a pending CSR", () => {
    const pendingCsrSnapshot = createInitialSnapshot({
      csrs: [{ id: "csr-x", node: "worker-0", kind: "client", status: "pending", createdAt: 0 }],
    });
    const result = oc(["adm", "certificate", "approve", "csr-x"], pendingCsrSnapshot);
    expect(result.dispatch).toEqual([
      expect.objectContaining({ type: "csr.approved", id: "csr-x", by: "learner" }),
    ]);
    expect(result.output).toContain("csr-x");
    expect(result.output).toContain("approved");
  });

  it("errors without dispatching for an unknown CSR", () => {
    const result = oc(["adm", "certificate", "approve", "does-not-exist"], createInitialSnapshot());
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/not found/i);
  });

  it("errors without dispatching for an already-approved CSR", () => {
    const snapshot = createInitialSnapshot({
      csrs: [
        {
          id: "csr-x",
          node: "worker-0",
          kind: "client",
          status: "approved",
          approvedBy: "auto",
          createdAt: 0,
        },
      ],
    });
    const result = oc(["adm", "certificate", "approve", "csr-x"], snapshot);
    expect(result.dispatch).toBeUndefined();
    expect(result.output).toMatch(/already approved/i);
  });
});

describe("oc unknown subcommands", () => {
  it("prints a friendly error for an unrecognized get resource", () => {
    const result = oc(["get", "pods"], createInitialSnapshot());
    expect(result.output).toMatch(/not supported|unknown/i);
  });

  it("shows usage (not an error) when called with no arguments", () => {
    const result = oc([], createInitialSnapshot());
    expect(result.output).toContain("oc get nodes");
    expect(result.output).not.toMatch(/^error/i);
  });

  it("shows an error plus usage for a completely unrecognized subcommand", () => {
    const result = oc(["frobnicate"], createInitialSnapshot());
    expect(result.output).toMatch(/unknown command/i);
    expect(result.output).toContain("oc get nodes");
  });
});
