import type { InstallEvent } from "../../engine/events";
import { scenarioChapters, scenarioDuration, type Scenario } from "../../engine/scenario";
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
  const durationT = scenarioDuration(scenario);

  const ticks: TimelineTick[] = events.map((event, index) => ({
    id: `tick-${index}-${event.t}`,
    t: event.t,
    category: eventCategory(event),
    failed: isFailureEvent(event),
  }));

  const marks: TimelineMark[] = scenarioChapters(scenario).map((chapter, index) => ({
    id: `chapter-${index}`,
    t: chapter.t,
    title: chapter.title,
  }));

  return { durationT, scrubberT: currentT, marks, ticks };
}
