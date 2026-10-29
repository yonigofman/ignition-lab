import { scenarioChapters, type Scenario, type ScenarioStep } from "../../engine/scenario";
import type { ClusterSnapshot } from "../../engine/snapshot";

export interface LessonChapter {
  title: string;
  t: number;
  reached: boolean;
}

export interface LessonGate {
  gateId: string;
  prompt: string;
  hint?: string;
}

export interface LessonPredict {
  id?: string;
  question: string;
  options: string[];
}

export interface LessonState {
  chapters: LessonChapter[];
  activeGate: LessonGate | null;
  activePredict: LessonPredict | null;
}

export function deriveLessonState(
  scenario: Scenario,
  snapshot: ClusterSnapshot,
  blockingStep: ScenarioStep | null
): LessonState {
  const chapters: LessonChapter[] = scenarioChapters(scenario).map((chapter) => ({
    ...chapter,
    reached: snapshot.t >= chapter.t,
  }));

  const activeGate: LessonGate | null =
    blockingStep?.kind === "gate"
      ? { gateId: blockingStep.gateId, prompt: blockingStep.prompt, hint: blockingStep.hint }
      : null;

  const activePredict: LessonPredict | null =
    blockingStep?.kind === "predict"
      ? { id: blockingStep.id, question: blockingStep.question, options: blockingStep.options }
      : null;

  return { chapters, activeGate, activePredict };
}
