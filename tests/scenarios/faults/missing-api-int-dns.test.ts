import { describe, expect, it } from "vitest";
import { reduceAll } from "../../../src/engine/reducer";
import { applyFault } from "../../../src/engine/scenario";
import { createInitialSnapshot } from "../../../src/engine/snapshot";
import { SimulatorSource } from "../../../src/engine/sources/SimulatorSource";
import { missingApiIntDns } from "../../../src/scenarios/faults/missing-api-int-dns";
import { upi3m2w } from "../../../src/scenarios/upi-3m-2w";

const faulted = applyFault(upi3m2w, missingApiIntDns);

describe("missing-api-int-dns fault", () => {
  it("shows all 3 masters failing ignition with an api-int DNS reason, and blocks on a gate", () => {
    const source = new SimulatorSource(faulted);
    const events = source.getEvents();

    const failures = events.filter(
      (e): e is typeof e & { type: "ignition.failed" } => e.type === "ignition.failed"
    );
    expect(failures).toHaveLength(3);
    expect(failures.every((e) => e.reason.includes("api-int"))).toBe(true);
    expect(events.some((e) => e.type === "dns.query" && e.result === "nxdomain")).toBe(true);
    // the healthy mcs_served events must not also be present
    expect(events.some((e) => e.type === "ignition.mcs_served" && e.pool === "master")).toBe(false);

    expect(source.getBlockingStep()).toMatchObject({ kind: "gate", gateId: "fix-api-int-dns" });
  });

  it("dig would genuinely show NXDOMAIN before the fix - the record is actually gone, not just narrated", () => {
    const source = new SimulatorSource(faulted);
    const snapshot = reduceAll(source.getEvents(), Infinity, createInitialSnapshot(faulted.initialState));
    expect(snapshot.dns["api-int.demo.lab.example.com"]).toBeUndefined();
  });

  it("stays blocked on an unrelated DNS fix", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({
      t: 38,
      type: "dns.record",
      name: "something-else.demo.lab.example.com",
      ip: "1.2.3.4",
      action: "add",
    });
    expect(source.getBlockingStep()).toMatchObject({ gateId: "fix-api-int-dns" });
  });

  it("clears once lab dns add restores api-int, reaching the rest of the scenario", () => {
    const source = new SimulatorSource(faulted);
    source.dispatch({
      t: 38,
      type: "dns.record",
      name: "api-int.demo.lab.example.com",
      ip: "192.168.1.10",
      action: "add",
    });

    expect(source.getBlockingStep()).not.toMatchObject({ gateId: "fix-api-int-dns" });
    const events = source.getEvents();
    expect(events.some((e) => e.type === "bootstrap.complete")).toBe(true);
  });
});
