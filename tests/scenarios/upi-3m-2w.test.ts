import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { upi3m2w } from "../../src/scenarios/upi-3m-2w";
import { fullEventsFor } from "../helpers/fullScenarioEvents";
import { BOOTSTRAP_LB_GATE_FIXES } from "../helpers/upi3m2wGateFixes";

/** A fresh SimulatorSource with every predict acknowledged and the bootstrap-removal gate cleared, parked right at the client-CSR gate. */
function sourceAtClientCsrGate(): SimulatorSource {
  const source = new SimulatorSource(upi3m2w);
  for (let i = 0; i < upi3m2w.steps.length; i++) {
    const step = upi3m2w.steps[i];
    if (step?.kind === "predict") source.acknowledge(i);
  }
  for (const event of BOOTSTRAP_LB_GATE_FIXES) source.dispatch(event);
  return source;
}

describe("upi-3m-2w > worker client CSR gate", () => {
  it("blocks once both workers have a pending client CSR, and not before", () => {
    const source = sourceAtClientCsrGate();

    const blocking = source.getBlockingStep();
    expect(blocking).toMatchObject({ kind: "gate", gateId: "approve-worker-client-csrs" });

    const events = source.getEvents();
    expect(events.some((e) => e.type === "csr.created" && e.id === "csr-worker-0-client")).toBe(true);
    expect(events.some((e) => e.type === "csr.created" && e.id === "csr-worker-1-client")).toBe(true);
    // the serving CSRs must not exist yet - they're scripted after this gate
    expect(events.some((e) => e.type === "csr.created" && e.id === "csr-worker-0-serving")).toBe(false);
  });

  it("does not clear with only one of the two workers approved", () => {
    const source = sourceAtClientCsrGate();
    source.dispatch({ t: 112, type: "csr.approved", id: "csr-worker-0-client", by: "learner" });

    expect(source.getBlockingStep()).toMatchObject({ gateId: "approve-worker-client-csrs" });
  });

  it("clears once both workers' client CSRs are approved, revealing the serving CSRs", () => {
    const source = sourceAtClientCsrGate();
    source.dispatch({ t: 112, type: "csr.approved", id: "csr-worker-0-client", by: "learner" });
    source.dispatch({ t: 113, type: "csr.approved", id: "csr-worker-1-client", by: "learner" });

    expect(source.getBlockingStep()).toMatchObject({ gateId: "approve-worker-serving-csrs" });
    const events = source.getEvents();
    expect(events.some((e) => e.type === "csr.created" && e.id === "csr-worker-0-serving")).toBe(true);
    expect(events.some((e) => e.type === "csr.created" && e.id === "csr-worker-1-serving")).toBe(true);
  });
});

describe("upi-3m-2w > worker serving CSR gate", () => {
  it("clears once both workers' serving CSRs are approved, letting workers go Ready", () => {
    const events = fullEventsFor(upi3m2w);
    const final = reduceAll(events, Infinity, createInitialSnapshot(upi3m2w.initialState));

    expect(final.phase).toBe("complete");
    expect(final.nodes["worker-0"]?.ready).toBe(true);
    expect(final.nodes["worker-1"]?.ready).toBe(true);
    expect(final.csrs.filter((c) => c.node === "worker-0" || c.node === "worker-1")).toHaveLength(4);
    expect(final.csrs.every((c) => c.status === "approved")).toBe(true);
  });
});

describe("upi-3m-2w > ingress backends", () => {
  it("seeds the ingress LB frontends pointing at workers, not masters", () => {
    const snapshot = createInitialSnapshot(upi3m2w.initialState);
    expect(snapshot.lb[80]).toEqual({ "worker-0": "up", "worker-1": "up" });
    expect(snapshot.lb[443]).toEqual({ "worker-0": "up", "worker-1": "up" });
  });
});
