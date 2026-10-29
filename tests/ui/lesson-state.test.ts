import { describe, expect, it } from "vitest";
import { reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { deriveLessonState } from "../../src/ui/lesson/deriveLessonState";
import { fullEventsFor } from "../helpers/fullScenarioEvents";

function snapshotAt(events: ReturnType<typeof fullEventsFor>, t: number) {
  return reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));
}

describe("deriveLessonState > chapters", () => {
  it("marks a chapter reached once the snapshot's t has caught up to it, not before", () => {
    const events = fullEventsFor(upiCompact3Node);

    const before = deriveLessonState(upiCompact3Node, snapshotAt(events, 19), null);
    const mastersJoin = before.chapters.find((c) => c.title === "Masters join");
    expect(mastersJoin).toMatchObject({ t: 20, reached: false });

    const after = deriveLessonState(upiCompact3Node, snapshotAt(events, 20), null);
    expect(after.chapters.find((c) => c.title === "Masters join")).toMatchObject({ t: 20, reached: true });
  });

  it("lists every chapter in the scenario", () => {
    const events = fullEventsFor(upiCompact3Node);
    const chapterCount = upiCompact3Node.steps.filter((s) => s.kind === "chapter").length;
    const state = deriveLessonState(upiCompact3Node, snapshotAt(events, 0), null);
    expect(state.chapters).toHaveLength(chapterCount);
  });
});

describe("deriveLessonState > activeGate", () => {
  it("is null when nothing is blocking", () => {
    const events = fullEventsFor(upiCompact3Node);
    const state = deriveLessonState(upiCompact3Node, snapshotAt(events, 0), null);
    expect(state.activeGate).toBeNull();
  });

  it("reflects the gate's prompt and hint when a gate step is blocking", () => {
    const source = new SimulatorSource(upiCompact3Node);
    // acknowledge the 3 predicts ahead of the gate so the gate itself is what's blocking
    for (let i = 0; i < upiCompact3Node.steps.length; i++) {
      const step = upiCompact3Node.steps[i];
      if (step?.kind === "predict") source.acknowledge(i);
    }
    const events = source.getEvents();
    const blockingStep = source.getBlockingStep();
    expect(blockingStep?.kind).toBe("gate");

    const snapshot = reduceAll(events, Infinity, createInitialSnapshot(upiCompact3Node.initialState));
    const state = deriveLessonState(upiCompact3Node, snapshot, blockingStep);
    expect(state.activeGate).toMatchObject({
      gateId: "remove-bootstrap-from-lb",
      prompt: expect.stringContaining("load balancer"),
      hint: expect.stringContaining("lab lb rm"),
    });
    expect(state.activePredict).toBeNull();
  });
});

describe("deriveLessonState > activePredict", () => {
  it("reflects the predict's question and options when a predict step is blocking", () => {
    const source = new SimulatorSource(upiCompact3Node);
    const events = source.getEvents();
    const blockingStep = source.getBlockingStep();
    expect(blockingStep?.kind).toBe("predict");

    const snapshot = reduceAll(events, Infinity, createInitialSnapshot(upiCompact3Node.initialState));
    const state = deriveLessonState(upiCompact3Node, snapshot, blockingStep);
    expect(state.activePredict).toMatchObject({
      id: "predict-temp-control-plane",
      question: expect.stringContaining("temporary control plane"),
    });
    expect(state.activePredict?.options.length).toBeGreaterThan(1);
    expect(state.activeGate).toBeNull();
  });

  it("does not leak the answer or explanation", () => {
    const source = new SimulatorSource(upiCompact3Node);
    const events = source.getEvents();
    const blockingStep = source.getBlockingStep();
    const snapshot = reduceAll(events, Infinity, createInitialSnapshot(upiCompact3Node.initialState));
    const state = deriveLessonState(upiCompact3Node, snapshot, blockingStep);
    expect(state.activePredict).not.toHaveProperty("answer");
    expect(state.activePredict).not.toHaveProperty("explain");
  });
});

describe("deriveLessonState determinism", () => {
  it("produces the identical state when called twice with the same inputs", () => {
    const events = fullEventsFor(upiCompact3Node);
    const snapshot = snapshotAt(events, 60);
    const a = deriveLessonState(upiCompact3Node, snapshot, null);
    const b = deriveLessonState(upiCompact3Node, snapshot, null);
    expect(a).toEqual(b);
  });
});
