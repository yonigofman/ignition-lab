import { maxEventTime, type InstallEvent } from "../../engine/events";
import type { Scenario } from "../../engine/scenario";
import { eventCategory, isFailureEvent, type EventCategory } from "../eventCategory";

export interface TimelineMark {
  id: string;
  t: number;
  title: string;
}

export interface TimelineTick {
  id: string;
  t: number;
  category: EventCategory;
  failed: boolean;
}

export interface TimelineView {
  durationT: number;
  scrubberT: number;
  marks: TimelineMark[];
  ticks: TimelineTick[];
}

export function deriveTimelineView(scenario: Scenario, events: InstallEvent[], currentT: number): TimelineView {
  const durationT = maxEventTime(events);

  const ticks: TimelineTick[] = events.map((event, index) => ({
    id: `tick-${index}-${event.t}`,
    t: event.t,
    category: eventCategory(event),
    failed: isFailureEvent(event),
  }));

  const marks: TimelineMark[] = [];
  let pendingChapters: string[] = [];
  let lastEventT = 0;
  for (const step of scenario.steps) {
    if (step.kind === "chapter") {
      pendingChapters.push(step.title);
      continue;
    }
    if (step.kind === "event") {
      for (const title of pendingChapters) {
        marks.push({ id: `chapter-${marks.length}`, t: step.event.t, title });
      }
      pendingChapters = [];
      lastEventT = step.event.t;
    }
  }
  for (const title of pendingChapters) {
    marks.push({ id: `chapter-${marks.length}`, t: lastEventT, title });
  }

  return { durationT, scrubberT: currentT, marks, ticks };
}
