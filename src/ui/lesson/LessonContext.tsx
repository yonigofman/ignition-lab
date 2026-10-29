import { createContext, useContext } from "react";
import type { InstallEvent, NodeId } from "../../engine/events";
import type { Scenario } from "../../engine/scenario";
import type { ClusterSnapshot } from "../../engine/snapshot";
import type { LessonState } from "./deriveLessonState";

export interface LessonContextValue {
  scenario: Scenario;
  events: InstallEvent[];
  snapshot: ClusterSnapshot;
  currentT: number;
  isPlaying: boolean;
  lessonState: LessonState;
  play: () => void;
  pause: () => void;
  dispatch: (events: InstallEvent[]) => void;
  acknowledge: (stepIndex: number) => void;
  setHighlightedNodeId: (id: NodeId | null) => void;
  setOpenArtifactId: (id: string | null) => void;
}

export const LessonContext = createContext<LessonContextValue | null>(null);

export function useLesson(): LessonContextValue {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson must be used within a LessonContext provider");
  return ctx;
}
