import { useLesson } from "../LessonContext";

export interface GateProps {
  id: string;
}

export function Gate({ id }: GateProps) {
  const { scenario, lessonState } = useLesson();

  const step = scenario.steps.find((s) => s.kind === "gate" && s.gateId === id);
  if (!step || step.kind !== "gate") {
    return (
      <div className="my-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        Unknown gate: "{id}"
      </div>
    );
  }

  const isActive = lessonState.activeGate?.gateId === id;
  if (!isActive) {
    return null;
  }

  return (
    <div className="my-3 rounded border border-amber-500/60 bg-amber-500/10 p-3">
      <div className="text-sm font-semibold text-amber-400">{step.prompt}</div>
      {step.hint && <div className="mt-1 text-xs text-(--text-muted)">{step.hint}</div>}
    </div>
  );
}
