import { describe, expect, it } from "vitest";
import { scenarioChapters, type Scenario } from "../../src/engine/scenario";

const scenario: Scenario = {
  id: "fixture",
  title: "Fixture",
  mode: "upi",
  topology: { nodes: [], links: [] },
  initialState: {},
  steps: [
    { kind: "chapter", title: "Chapter A" },
    { kind: "event", event: { t: 0, type: "cvo.started" } },
    { kind: "event", event: { t: 10, type: "bootstrap.complete" } },
    { kind: "chapter", title: "Chapter B" },
    { kind: "event", event: { t: 20, type: "install.complete" } },
    { kind: "chapter", title: "Trailing chapter with no following event" },
  ],
  artifacts: [],
};

describe("scenarioChapters", () => {
  it("places each chapter at the t of the next event step", () => {
    expect(scenarioChapters(scenario)).toEqual([
      { title: "Chapter A", t: 0 },
      { title: "Chapter B", t: 20 },
      { title: "Trailing chapter with no following event", t: 20 },
    ]);
  });

  it("returns an empty list for a scenario with no chapters", () => {
    const noChapters: Scenario = {
      ...scenario,
      steps: [{ kind: "event", event: { t: 5, type: "cvo.started" } }],
    };
    expect(scenarioChapters(noChapters)).toEqual([]);
  });
});
