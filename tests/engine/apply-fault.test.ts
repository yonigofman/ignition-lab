import { describe, expect, it } from "vitest";
import { applyFault, type FaultSpec, type Scenario } from "../../src/engine/scenario";

const baseScenario: Scenario = {
  id: "fixture",
  title: "Fixture",
  mode: "upi",
  topology: { nodes: [], links: [] },
  initialState: {},
  steps: [
    { kind: "event", event: { t: 0, type: "dns.query", from: "master-0", name: "api-int.lab", result: "ok" } },
    { kind: "event", event: { t: 1, type: "cvo.started" } },
  ],
};

describe("applyFault", () => {
  it("rewrites steps without mutating the original scenario", () => {
    const dropDnsQuery: FaultSpec = {
      id: "missing-api-int",
      rewrite: (steps) =>
        steps.filter((step) => !(step.kind === "event" && step.event.type === "dns.query")),
    };

    const faulted = applyFault(baseScenario, dropDnsQuery);

    expect(faulted.steps).toHaveLength(1);
    expect(faulted.steps[0]).toMatchObject({ kind: "event", event: { type: "cvo.started" } });
    expect(baseScenario.steps).toHaveLength(2);
    expect(faulted.id).toBe("fixture+missing-api-int");
  });
});
