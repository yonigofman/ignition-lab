import { useMemo } from "react";
import type { InstallEvent } from "../../engine/events";
import type { Scenario } from "../../engine/scenario";
import { categoryColor } from "../eventCategory";
import { deriveTimelineView } from "./deriveTimelineView";

const SPEEDS = [0.5, 1, 2, 5, 10];

export interface TimelineProps {
  scenario: Scenario;
  events: InstallEvent[];
  currentT: number;
  durationT: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
  onSeek: (t: number) => void;
}

export function Timeline({
  scenario,
  events,
  currentT,
  durationT,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onSetSpeed,
  onSeek,
}: TimelineProps) {
  const view = useMemo(() => deriveTimelineView(scenario, events, currentT), [scenario, events, currentT]);
  const safeDuration = durationT > 0 ? durationT : 1;
  const progressPct = Math.min(100, (view.scrubberT / safeDuration) * 100);

  return (
    <div className="flex w-full flex-col gap-3 border-t border-(--border) bg-(--surface-muted) px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--accent) text-base text-(--accent-text) shadow-md shadow-cyan-500/20 transition hover:brightness-110 active:scale-95"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <select
          value={speed}
          onChange={(e) => onSetSpeed(Number(e.target.value))}
          className="rounded border border-(--border) bg-(--surface) px-2 py-1.5 text-xs text-(--text) hover:border-(--text-muted)"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>

        <span className="font-mono text-xs tabular-nums text-(--text-muted)">
          t = {view.scrubberT.toFixed(1)}s / {view.durationT.toFixed(0)}s
        </span>
      </div>

      <div className="relative h-9 px-1">
        {view.ticks.map((tick) => (
          <div
            key={tick.id}
            title={`t=${tick.t}`}
            className="absolute top-0 h-3.5 w-[3px] rounded-full opacity-80"
            style={{
              left: `${(tick.t / safeDuration) * 100}%`,
              backgroundColor: tick.failed ? "#ef4444" : categoryColor(tick.category),
            }}
          />
        ))}

        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={Math.min(view.scrubberT, safeDuration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="scrubber absolute top-[18px] h-1.5 w-full"
          style={{
            background: `linear-gradient(to right, var(--accent) ${progressPct}%, var(--border) ${progressPct}%)`,
          }}
        />

        {view.marks.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => onSeek(mark.t)}
            title={mark.title}
            className="absolute top-6 -translate-x-1/2 text-sm text-amber-400/70 transition hover:scale-125 hover:text-amber-400"
            style={{ left: `${(mark.t / safeDuration) * 100}%` }}
          >
            ▲
          </button>
        ))}
      </div>
    </div>
  );
}
