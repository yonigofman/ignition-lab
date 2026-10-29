import { describe, expect, it } from "vitest";
import { scenarioDuration, type Scenario } from "../../src/engine/scenario";

function scenarioWithGateAfterT(gateCutoffT: number): Scenario {
  return {
    id: "fixture",
    title: "Fixture",
    mode: "upi",
    topology: { nodes: [], links: [] },
    initialState: {},
    steps: [
      { kind: "event", event: { t: 0, type: "cvo.started" } },
      {
        kind: "gate",
        gateId: "g1",
        prompt: "do a thing",
        check: () => false,
      },
      { kind: "event", event: { t: gateCutoffT, type: "install.complete" } },
    ],
  };
}

describe("scenarioDuration", () => {
  it("is the max t across all event steps, regardless of any gate between them", () => {
    expect(scenarioDuration(scenarioWithGateAfterT(150))).toBe(150);
  });

  it("is 0 for a scenario with no event steps", () => {
    const scenario: Scenario = {
      id: "empty",
      title: "Empty",
      mode: "upi",
      topology: { nodes: [], links: [] },
      initialState: {},
      steps: [{ kind: "chapter", title: "only a chapter" }],
    };
    expect(scenarioDuration(scenario)).toBe(0);
  });
});
