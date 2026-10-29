import type { LessonState } from "../lesson/deriveLessonState";

export interface BlockingBannerProps {
  lessonState: LessonState;
}

export function BlockingBanner({ lessonState }: BlockingBannerProps) {
  const { activeGate, activePredict } = lessonState;

  if (!activeGate && !activePredict) return null;

  if (activeGate) {
    return (
      <div className="flex items-center gap-2 border-t border-amber-500/60 bg-amber-500/10 px-4 py-2 text-sm">
        <span className="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-black">
          BLOCKED
        </span>
        <span className="font-medium text-amber-400">{activeGate.prompt}</span>
        {activeGate.hint && <span className="text-xs text-(--text-muted)">{activeGate.hint}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-sm">
      <span className="shrink-0 rounded bg-cyan-500 px-1.5 py-0.5 text-xs font-semibold text-black">PREDICT</span>
      <span className="font-medium text-cyan-400">{activePredict?.question}</span>
      <span className="text-xs text-(--text-muted)">Answer it in the lesson panel's "The bootstrap dance" module to continue.</span>
    </div>
  );
}
