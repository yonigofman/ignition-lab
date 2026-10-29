import type { InstallEvent } from "../../src/engine/events";
import type { Scenario } from "../../src/engine/scenario";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";

/**
 * Drives a SimulatorSource past every gate/predict in the scenario, the same
 * way a learner working through the lesson would, and returns the fully
 * unlocked event list. Tests that only care about "given this scenario's
 * full event history, does X compute correctly" use this instead of
 * re-deriving how to pass each gate/predict themselves.
 */
export function fullEventsFor(scenario: Scenario): InstallEvent[] {
  const source = new SimulatorSource(scenario);

  let blocking = source.getBlockingStep();
  let guard = 0;
  while (blocking) {
    if (guard++ > 1000) {
      throw new Error("fullEventsFor: too many blocking steps, possible infinite loop");
    }

    if (blocking.kind === "predict") {
      const index = scenario.steps.indexOf(blocking);
      source.acknowledge(index);
      blocking = source.getBlockingStep();
      continue;
    }

    if (blocking.kind === "gate" && blocking.gateId === "remove-bootstrap-from-lb") {
      source.dispatch({ t: 65, type: "lb.backend", frontend: 6443, backend: "bootstrap", state: "removed" });
      source.dispatch({ t: 66, type: "lb.backend", frontend: 22623, backend: "bootstrap", state: "removed" });
      blocking = source.getBlockingStep();
      continue;
    }

    if (blocking.kind === "gate" && blocking.gateId === "approve-worker-client-csrs") {
      source.dispatch({ t: 112, type: "csr.approved", id: "csr-worker-0-client", by: "learner" });
      source.dispatch({ t: 112, type: "csr.approved", id: "csr-worker-1-client", by: "learner" });
      blocking = source.getBlockingStep();
      continue;
    }

    if (blocking.kind === "gate" && blocking.gateId === "approve-worker-serving-csrs") {
      source.dispatch({ t: 117, type: "csr.approved", id: "csr-worker-0-serving", by: "learner" });
      source.dispatch({ t: 117, type: "csr.approved", id: "csr-worker-1-serving", by: "learner" });
      blocking = source.getBlockingStep();
      continue;
    }

    throw new Error(`fullEventsFor: don't know how to satisfy blocking step: ${JSON.stringify(blocking)}`);
  }

  return source.getEvents();
}
