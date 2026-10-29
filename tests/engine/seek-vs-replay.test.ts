import { describe, expect, it } from "vitest";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { reduce, reduceAll } from "../../src/engine/reducer";
import { createInitialSnapshot } from "../../src/engine/snapshot";

describe("seek vs replay equivalence", () => {
  const source = new SimulatorSource(upiCompact3Node);
  const events = source.getEvents();
  const maxT = Math.max(...events.map((e) => e.t));

  it("has events to exercise (scenario is not empty)", () => {
    expect(events.length).toBeGreaterThan(10);
  });

  it("produces the same snapshot whether seeking directly or replaying incrementally, at every sampled t", () => {
    const sampledTimes = [0, 1, 10, 22, 35, 55, 60, 70, 85, 92, 110, 135, 150, maxT];

    let replaySnapshot = createInitialSnapshot(upiCompact3Node.initialState);
    let replayedUpTo = -1;
    const sorted = [...events].sort((a, b) => a.t - b.t);

    for (const t of sampledTimes) {
      const seekSnapshot = reduceAll(events, t, createInitialSnapshot(upiCompact3Node.initialState));

      for (const e of sorted) {
        if (e.t > replayedUpTo && e.t <= t) {
          replaySnapshot = reduce(replaySnapshot, e);
        }
      }
      replayedUpTo = t;

      expect(seekSnapshot).toEqual(replaySnapshot);
    }
  });

  it("reaches install.complete and has all three masters ready at the end", () => {
    const final = reduceAll(events, maxT, createInitialSnapshot(upiCompact3Node.initialState));
    expect(final.phase).toBe("complete");
    expect(final.nodes["master-0"]?.ready).toBe(true);
    expect(final.nodes["master-1"]?.ready).toBe(true);
    expect(final.nodes["master-2"]?.ready).toBe(true);
    expect(final.etcdMembers).toEqual(["master-0", "master-1", "master-2"]);
  });
});
