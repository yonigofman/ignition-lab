import { describe, expect, it } from "vitest";
import { applyFault } from "../../../src/engine/scenario";
import { reduceAll } from "../../../src/engine/reducer";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { missingAppsWildcard } from "../../../src/scenarios/faults/missing-apps-wildcard";
import { upi3m2w } from "../../../src/scenarios/upi-3m-2w";
import { ALL_PRIOR_GATE_FIXES } from "../../helpers/upi3m2wGateFixes";

const faulted = applyFault(upi3m2w, missingAppsWildcard);

function sourcePastPriorGates(): SimulatorSource {
  const source = new SimulatorSource(faulted);
  for (const event of ALL_PRIOR_GATE_FIXES) source.dispatch(event);
  return source;
}

describe("missing-apps-wildcard fault", () => {
  it("shows ingress available but authentication/console degraded, blocking on a gate", () => {
    const source = sourcePastPriorGates();
    const events = source.getEvents();
    const snapshot = reduceAll(events, Infinity, createInitialSnapshot(faulted.initialState));

    expect(snapshot.clusterOperators.ingress).toMatchObject({ available: true, degraded: false });
    expect(snapshot.clusterOperators.authentication).toMatchObject({ available: false, degraded: true });
    expect(snapshot.clusterOperators.console).toMatchObject({ available: false, degraded: true });
    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-apps-wildcard" });
  });

  it("clears once lab dns add restores the wildcard, and authentication/console recover", () => {
    const source = sourcePastPriorGates();
    source.dispatch({
      t: 156,
      type: "dns.record",
      name: "*.apps.demo.lab.example.com",
      ip: "192.168.1.10",
      action: "add",
    });

    expect(source.getBlockingStep()).not.toMatchObject({ gateId: "fix-apps-wildcard" });
    const finalSnapshot = reduceAll(source.getEvents(), Infinity, createInitialSnapshot(faulted.initialState));
    expect(finalSnapshot.clusterOperators.authentication).toMatchObject({ available: true, degraded: false });
    expect(finalSnapshot.clusterOperators.console).toMatchObject({ available: true, degraded: false });
    expect(finalSnapshot.phase).toBe("complete");
  });
});
