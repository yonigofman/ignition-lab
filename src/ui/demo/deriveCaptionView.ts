import { scenarioChapters, type Scenario } from "../../engine/scenario";

export interface CaptionView {
  caption: string | null;
}

/** The most recently reached chapter's caption, held until the next captioned chapter. Used by demo mode to narrate the story in plain language instead of raw event log lines. */
export function deriveCaptionView(scenario: Scenario, currentT: number): CaptionView {
  const captioned = scenarioChapters(scenario).filter((c) => c.caption !== undefined && c.t <= currentT);
  if (captioned.length === 0) return { caption: null };

  const latest = captioned.reduce((a, b) => (b.t >= a.t ? b : a));
  return { caption: latest.caption as string };
}
