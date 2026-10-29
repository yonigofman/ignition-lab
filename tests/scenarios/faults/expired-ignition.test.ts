import { describe, expect, it } from "vitest";
import { applyFault } from "../../../src/engine/scenario";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { expiredIgnition } from "../../../src/scenarios/faults/expired-ignition";
import { upi3m2w } from "../../../src/scenarios/upi-3m-2w";

const faulted = applyFault(upi3m2w, expiredIgnition);

describe("expired-ignition fault", () => {
  it("shows bootstrap's ignition fetch failing with a certificate-expiry reason, blocking on a gate", () => {
    const source = new SimulatorSource(faulted);
    const events = source.getEvents();

    const failure = events.find((e) => e.type === "ignition.failed");
    expect(failure).toMatchObject({ node: "bootstrap" });
    expect(failure && "reason" in failure ? failure.reason : "").toMatch(/expired|x509/i);
    // nothing past the very start of bootstrap boot is reachable yet
    expect(events.some((e) => e.type === "bootstrap.temp_control_plane_up")).toBe(false);

    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-expired-ignition" });
  });

  it("clears once lab ignition regenerate's ignition.fetched is dispatched, reaching the rest of the scenario", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({ t: 11, type: "learner.action", action: "lab.ignition.regenerate", payload: { node: "bootstrap" } });
    source.dispatch({ t: 11, type: "ignition.fetched", node: "bootstrap", file: "bootstrap.ign", from: "helper" });

    expect(source.getBlockingStep()).not.toMatchObject({ gateId: "fix-expired-ignition" });
    const events = source.getEvents();
    expect(events.some((e) => e.type === "bootstrap.temp_control_plane_up")).toBe(true);
  });

  it("does not clear on the learner.action alone, without the regenerate fetch", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({ t: 11, type: "learner.action", action: "lab.ignition.regenerate", payload: { node: "bootstrap" } });
    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-expired-ignition" });
  });

  it("does not clear on an unrelated fix for a different node", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({ t: 11, type: "ignition.fetched", node: "master-0", file: "master.ign", from: "helper" });
    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-expired-ignition" });
  });
});
