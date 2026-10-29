import { describe, expect, it } from "vitest";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import type { Scenario } from "../../src/engine/scenario";
import { reduceAll } from "../../src/engine/reducer";

function scenarioWithGate(): Scenario {
  return {
    id: "gate-fixture",
    title: "Gate fixture",
    mode: "upi",
    topology: { nodes: [], links: [] },
    initialState: {},
    steps: [
      { kind: "event", event: { t: 0, type: "csr.created", id: "csr-1", node: "worker-0", kind: "client" } },
      {
        kind: "gate",
        gateId: "approve-csr",
        prompt: "approve the csr",
        check: (s) => s.csrs.some((c) => c.id === "csr-1" && c.status === "approved"),
      },
      { kind: "event", event: { t: 10, type: "node.ready", node: "worker-0", ready: true } },
    ],
  };
}

function scenarioWithPredict(): Scenario {
  return {
    id: "predict-fixture",
    title: "Predict fixture",
    mode: "upi",
    topology: { nodes: [], links: [] },
    initialState: {},
    steps: [
      { kind: "event", event: { t: 0, type: "cvo.started" } },
      {
        kind: "predict",
        question: "what happens next?",
        options: ["bootstrap completes", "install fails"],
        answer: 0,
        explain: "bootstrap completes once the production control plane takes over",
      },
      { kind: "event", event: { t: 5, type: "bootstrap.complete" } },
    ],
  };
}

describe("SimulatorSource", () => {
  it("emits all event steps when there are no gates or predicts", () => {
    const source = new SimulatorSource({
      id: "plain",
      title: "Plain",
      mode: "upi",
      topology: { nodes: [], links: [] },
      initialState: {},
      steps: [
        { kind: "event", event: { t: 0, type: "cvo.started" } },
        { kind: "chapter", title: "chapter 1" },
        { kind: "event", event: { t: 1, type: "bootstrap.complete" } },
      ],
    });

    expect(source.getEvents()).toHaveLength(2);
  });

  it("stops emitting events at an unsatisfied gate", () => {
    const source = new SimulatorSource(scenarioWithGate());
    const events = source.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "csr.created" });
  });

  it("unlocks events past the gate once a dispatched event satisfies check()", () => {
    const source = new SimulatorSource(scenarioWithGate());
    source.dispatch({ t: 5, type: "csr.approved", id: "csr-1", by: "learner" });

    const events = source.getEvents();
    expect(events.map((e) => e.type)).toEqual(["csr.created", "node.ready", "csr.approved"]);

    const snapshot = reduceAll(events, Infinity);
    expect(snapshot.nodes["worker-0"]?.ready).toBe(true);
  });

  it("stops emitting events at an unacknowledged predict", () => {
    const source = new SimulatorSource(scenarioWithPredict());
    const events = source.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "cvo.started" });
  });

  it("unlocks events past a predict once acknowledged", () => {
    const source = new SimulatorSource(scenarioWithPredict());
    source.acknowledge(1);
    const events = source.getEvents();
    expect(events.map((e) => e.type)).toEqual(["cvo.started", "bootstrap.complete"]);
  });
});

describe("SimulatorSource.getBlockingStep", () => {
  it("returns null when nothing is blocking", () => {
    const source = new SimulatorSource({
      id: "plain",
      title: "Plain",
      mode: "upi",
      topology: { nodes: [], links: [] },
      initialState: {},
      steps: [{ kind: "event", event: { t: 0, type: "cvo.started" } }],
    });
    expect(source.getBlockingStep()).toBeNull();
  });

  it("returns the exact gate step blocking emission", () => {
    const source = new SimulatorSource(scenarioWithGate());
    expect(source.getBlockingStep()).toMatchObject({ kind: "gate", gateId: "approve-csr" });
  });

  it("returns the exact predict step blocking emission", () => {
    const source = new SimulatorSource(scenarioWithPredict());
    expect(source.getBlockingStep()).toMatchObject({ kind: "predict", question: "what happens next?" });
  });

  it("returns null again once the blocking gate is satisfied", () => {
    const source = new SimulatorSource(scenarioWithGate());
    source.dispatch({ t: 5, type: "csr.approved", id: "csr-1", by: "learner" });
    expect(source.getBlockingStep()).toBeNull();
  });

  it("returns null again once the blocking predict is acknowledged", () => {
    const source = new SimulatorSource(scenarioWithPredict());
    source.acknowledge(1);
    expect(source.getBlockingStep()).toBeNull();
  });
});
