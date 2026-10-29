import { describe, expect, it } from "vitest";
import { applyFault } from "../../../src/engine/scenario";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { bootstrapLeftInLb } from "../../../src/scenarios/faults/bootstrap-left-in-lb";
import { upi3m2w } from "../../../src/scenarios/upi-3m-2w";
import { WORKER_CSR_GATE_FIXES } from "../../helpers/upi3m2wGateFixes";

const faulted = applyFault(upi3m2w, bootstrapLeftInLb);

describe("bootstrap-left-in-lb fault", () => {
  it("has no remove-bootstrap-from-lb gate: install completes without any LB fix dispatched", () => {
    const source = new SimulatorSource(faulted);
    for (const event of WORKER_CSR_GATE_FIXES) source.dispatch(event);

    expect(source.getBlockingStep()).toBeNull();
    const snapshot = reduceAll(source.getEvents(), Infinity, createInitialSnapshot(faulted.initialState));
    expect(snapshot.phase).toBe("complete");

    // the symptom: bootstrap is still a live backend on both API frontends
    expect(snapshot.lb[6443]?.bootstrap).toBe("up");
    expect(snapshot.lb[22623]?.bootstrap).toBe("up");
  });

  it("the symptom clears once the learner notices and runs lab lb rm themselves", () => {
    const source = new SimulatorSource(faulted);
    for (const event of WORKER_CSR_GATE_FIXES) source.dispatch(event);
    source.dispatch({ t: 190, type: "lb.backend", frontend: 6443, backend: "bootstrap", state: "removed" });
    source.dispatch({ t: 191, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "removed" });

    const snapshot = reduceAll(source.getEvents(), Infinity, createInitialSnapshot(faulted.initialState));
    expect(snapshot.lb[6443]?.bootstrap).toBe("removed");
    expect(snapshot.lb[22623]?.bootstrap).toBe("removed");
  });
});
