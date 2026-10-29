import { useEffect, useState } from "react";
import { useLesson } from "../LessonContext";

export interface PlayUntilProps {
  chapter: string;
}

export function PlayUntil({ chapter }: PlayUntilProps) {
  const { lessonState, currentT, isPlaying, play, pause } = useLesson();
  const [armed, setArmed] = useState(false);

  const target = lessonState.chapters.find((c) => c.title === chapter);

  useEffect(() => {
    if (!armed || !target) return;
    if (currentT >= target.t) {
      pause();
      setArmed(false);
    }
  }, [armed, currentT, target, pause]);

  if (!target) {
    return (
      <div className="my-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        Unknown chapter: "{chapter}"
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setArmed(true);
        play();
      }}
      disabled={target.reached}
      className="my-2 rounded border border-(--border) bg-(--surface) px-3 py-1.5 text-xs text-(--text) hover:bg-(--surface-muted) disabled:cursor-default disabled:opacity-50"
    >
      {target.reached ? `✓ Reached "${chapter}"` : armed && isPlaying ? "Playing…" : `▶ Play until "${chapter}"`}
    </button>
  );
}
