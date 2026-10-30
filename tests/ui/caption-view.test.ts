import { describe, expect, it } from "vitest";
import type { Scenario } from "../../src/engine/scenario";
import { deriveCaptionView } from "../../src/ui/demo/deriveCaptionView";

const scenario: Scenario = {
  id: "fixture",
  title: "Fixture",
  mode: "upi",
  topology: { nodes: [], links: [] },
  initialState: {},
  artifacts: [],
  steps: [
    { kind: "chapter", title: "Chapter A", caption: "Bootstrap is booting up." },
    { kind: "event", event: { t: 0, type: "cvo.started" } },
    { kind: "chapter", title: "Chapter B (no caption)" },
    { kind: "event", event: { t: 10, type: "bootstrap.complete" } },
    { kind: "chapter", title: "Chapter C", caption: "Masters are joining the cluster." },
    { kind: "event", event: { t: 20, type: "install.complete" } },
  ],
};

describe("deriveCaptionView", () => {
  it("shows no caption before the first captioned chapter is reached", () => {
    expect(deriveCaptionView(scenario, -1).caption).toBeNull();
  });

  it("shows the first chapter's caption once its t is reached", () => {
    expect(deriveCaptionView(scenario, 0).caption).toBe("Bootstrap is booting up.");
  });

  it("keeps showing the last captioned chapter's text through an uncaptioned chapter", () => {
    expect(deriveCaptionView(scenario, 10).caption).toBe("Bootstrap is booting up.");
  });

  it("switches to the next captioned chapter once its t is reached", () => {
    expect(deriveCaptionView(scenario, 20).caption).toBe("Masters are joining the cluster.");
  });

  it("returns null for a scenario with no captioned chapters at all", () => {
    const noCaptions: Scenario = { ...scenario, steps: scenario.steps.map((s) => (s.kind === "chapter" ? { ...s, caption: undefined } : s)) };
    expect(deriveCaptionView(noCaptions, 20).caption).toBeNull();
  });
});
