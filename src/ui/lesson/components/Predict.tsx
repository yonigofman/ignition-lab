import { useState } from "react";
import { useLesson } from "../LessonContext";

export interface PredictProps {
  id: string;
}

export function Predict({ id }: PredictProps) {
  const { scenario, lessonState, acknowledge } = useLesson();
  const [picked, setPicked] = useState<number | null>(null);

  const stepIndex = scenario.steps.findIndex((s) => s.kind === "predict" && s.id === id);
  const step = stepIndex >= 0 ? scenario.steps[stepIndex] : undefined;

  if (!step || step.kind !== "predict") {
    return (
      <div className="my-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        Unknown predict: "{id}"
      </div>
    );
  }

  const isActive = lessonState.activePredict?.id === id;
  if (!isActive && picked === null) {
    return null;
  }

  return (
    <div className="my-3 rounded border border-(--border) bg-(--surface) p-3">
      <div className="mb-2 text-sm font-semibold text-(--text)">{step.question}</div>
      <div className="flex flex-col gap-1.5">
        {step.options.map((option, index) => {
          const isPicked = picked === index;
          const isCorrect = index === step.answer;
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(index);
                acknowledge(stepIndex);
              }}
              className={`rounded border px-3 py-1.5 text-left text-xs ${
                picked === null
                  ? "border-(--border) text-(--text) hover:bg-(--surface-muted)"
                  : isPicked && isCorrect
                    ? "border-green-500 bg-green-500/10 text-green-400"
                    : isPicked
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : isCorrect
                        ? "border-green-500/50 text-green-400"
                        : "border-(--border) text-(--text-muted)"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-2 text-xs text-(--text-muted)">
          {picked === step.answer ? "Correct. " : "Not quite. "}
          {step.explain}
        </div>
      )}
    </div>
  );
}
