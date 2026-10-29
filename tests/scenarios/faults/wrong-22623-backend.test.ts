import { describe, expect, it } from "vitest";
import { applyFault } from "../../../src/engine/scenario";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { wrong22623Backend } from "../../../src/scenarios/faults/wrong-22623-backend";
import { upi3m2w } from "../../../src/scenarios/upi-3m-2w";

const faulted = applyFault(upi3m2w, wrong22623Backend);

describe("wrong-22623-backend fault", () => {
  it("shows the 22623 backend down and masters failing ignition with a connection reason", () => {
    const source = new SimulatorSource(faulted);
    const events = source.getEvents();

    expect(events.some((e) => e.type === "lb.backend" && e.frontend === 22623 && e.state === "down")).toBe(true);
    const snapshot = reduceAll(events, Infinity, createInitialSnapshot(faulted.initialState));
    expect(snapshot.lb[22623]?.bootstrap).toBe("down");

    const failures = events.filter(
      (e): e is typeof e & { type: "ignition.failed" } => e.type === "ignition.failed"
    );
    expect(failures).toHaveLength(3);
    expect(failures.every((e) => e.reason.includes("22623"))).toBe(true);
    // this fault's DNS is fine - distinguishable from the DNS fault
    expect(failures.every((e) => !e.reason.includes("resolve"))).toBe(true);

    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-22623-backend" });
  });

  it("clears once lab lb set restores the backend", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({ t: 38, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "up" });

    expect(source.getBlockingStep()).not.toMatchObject({ gateId: "fix-22623-backend" });
    const events = source.getEvents();
    expect(events.some((e) => e.type === "bootstrap.complete")).toBe(true);
  });
});
