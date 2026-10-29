import type { InstallEvent } from "../../engine/events";

export interface WhoDoesThisActive {
  actor: "learner" | "installer";
  contrastNote: string;
}

export interface WhoDoesThisView {
  active: WhoDoesThisActive | null;
}

const DEFAULT_WINDOW_SECONDS = 5;

/** Surfaces the most recent contrast-worthy event (one with a `contrastNote`) within a trailing window of `currentT`, or nothing when the toggle is off. Pure function of the event stream + toggle + time - no new cluster state. */
export function deriveWhoDoesThisView(
  events: InstallEvent[],
  currentT: number,
  enabled: boolean,
  windowSeconds = DEFAULT_WINDOW_SECONDS
): WhoDoesThisView {
  if (!enabled) return { active: null };

  const candidates = events.filter(
    (e) => e.contrastNote !== undefined && e.t <= currentT && e.t > currentT - windowSeconds
  );
  if (candidates.length === 0) return { active: null };

  const latest = candidates.reduce((a, b) => (b.t >= a.t ? b : a));
  return { active: { actor: latest.actor ?? "installer", contrastNote: latest.contrastNote as string } };
}
