import { describe, expect, it } from "vitest";
import { scenarioDuration } from "../../src/engine/scenario";
import { SimulatorSource } from "../../src/engine/sources/SimulatorSource";
import { upiCompact3Node } from "../../src/scenarios/upi-compact-3node";
import { deriveTimelineView } from "../../src/ui/timeline/deriveTimelineView";
import { fullEventsFor } from "../helpers/fullScenarioEvents";

const events = fullEventsFor(upiCompact3Node);

describe("deriveTimelineView", () => {
  it("reports duration as the scenario's full potential duration", () => {
    const view = deriveTimelineView(upiCompact3Node, events, 0);
    expect(view.durationT).toBe(scenarioDuration(upiCompact3Node));
  });

  it("still reports the full scenario duration even when the event list is truncated by a gate", () => {
    const gatedEvents = new SimulatorSource(upiCompact3Node).getEvents();
    expect(Math.max(...gatedEvents.map((e) => e.t))).toBeLessThan(scenarioDuration(upiCompact3Node));

    const view = deriveTimelineView(upiCompact3Node, gatedEvents, 0);
    expect(view.durationT).toBe(scenarioDuration(upiCompact3Node));
  });

  it("reports the scrubber at the given current time", () => {
    const view = deriveTimelineView(upiCompact3Node, events, 42);
    expect(view.scrubberT).toBe(42);
  });

  it("places one tick per event, with its category and failure flag", () => {
    const view = deriveTimelineView(upiCompact3Node, events, 0);
    expect(view.ticks).toHaveLength(events.length);
    const installComplete = view.ticks.find((t) => t.t === 150);
    expect(installComplete).toMatchObject({ category: "control-plane", failed: false });
  });

  it("places chapter marks at the time of the next event after the chapter step", () => {
    const view = deriveTimelineView(upiCompact3Node, events, 0);
    const bootstrapBoots = view.marks.find((m) => m.title === "Bootstrap boots");
    expect(bootstrapBoots?.t).toBe(0);

    const mastersJoin = view.marks.find((m) => m.title === "Masters join");
    expect(mastersJoin?.t).toBe(20);

    const installCompleteChapter = view.marks.find((m) => m.title === "Install complete");
    expect(installCompleteChapter?.t).toBe(150);
  });

  it("produces one mark per chapter step in the scenario", () => {
    const chapterCount = upiCompact3Node.steps.filter((s) => s.kind === "chapter").length;
    const view = deriveTimelineView(upiCompact3Node, events, 0);
    expect(view.marks).toHaveLength(chapterCount);
  });

  it("produces the identical view when called twice for the same time", () => {
    const a = deriveTimelineView(upiCompact3Node, events, 60);
    const b = deriveTimelineView(upiCompact3Node, events, 60);
    expect(a).toEqual(b);
  });
});
