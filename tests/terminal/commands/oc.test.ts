import { describe, expect, it } from "vitest";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { upiCompact3Node } from "../../../src/scenarios/upi-compact-3node";
import { oc } from "../../../src/terminal/commands/oc";

const events = new SimulatorSource(upiCompact3Node).getEvents();
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
});
