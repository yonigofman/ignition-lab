import { useEffect } from "react";
import type { NodeId } from "../../../engine/events";
import { useLesson } from "../LessonContext";

export interface HighlightNodeProps {
  id: NodeId;
}

export function HighlightNode({ id }: HighlightNodeProps) {
  const { setHighlightedNodeId } = useLesson();

  useEffect(() => {
    setHighlightedNodeId(id);
    return () => setHighlightedNodeId(null);
  }, [id, setHighlightedNodeId]);

  return null;
}
