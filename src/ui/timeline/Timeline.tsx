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

  return (
    <div className="flex w-full flex-col gap-2 border-t border-(--border) bg-(--surface-muted) p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isPlaying ? onPause : onPlay}
          className="rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-600"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <select
          value={speed}
          onChange={(e) => onSetSpeed(Number(e.target.value))}
          className="rounded bg-slate-800 px-2 py-1 text-sm text-white"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>

        <span className="text-xs text-slate-400">
          t = {view.scrubberT.toFixed(1)}s / {view.durationT.toFixed(0)}s
        </span>
      </div>

      <div className="relative h-8">
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={0.1}
          value={Math.min(view.scrubberT, safeDuration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="absolute top-3 h-2 w-full"
        />

        {view.ticks.map((tick) => (
          <div
            key={tick.id}
            title={`t=${tick.t}`}
            className="absolute top-0 h-2 w-0.5"
            style={{
              left: `${(tick.t / safeDuration) * 100}%`,
              backgroundColor: tick.failed ? "#ef4444" : categoryColor(tick.category),
            }}
          />
        ))}

        {view.marks.map((mark) => (
          <button
            key={mark.id}
            type="button"
            onClick={() => onSeek(mark.t)}
            title={mark.title}
            className="absolute top-5 -translate-x-1/2 text-[10px] text-slate-300 hover:text-white"
            style={{ left: `${(mark.t / safeDuration) * 100}%` }}
          >
            ▲
          </button>
        ))}
      </div>
    </div>
  );
}
