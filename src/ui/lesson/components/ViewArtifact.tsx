import { useLesson } from "../LessonContext";

export interface ViewArtifactProps {
  id: string;
}

export function ViewArtifact({ id }: ViewArtifactProps) {
  const { scenario, setOpenArtifactId } = useLesson();

  const artifact = scenario.artifacts.find((a) => a.id === id);
  if (!artifact) {
    return (
      <div className="my-2 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">
        Unknown artifact: "{id}"
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpenArtifactId(id)}
      className="my-2 rounded border border-(--border) bg-(--surface) px-3 py-1.5 text-xs text-(--text) hover:bg-(--surface-muted)"
    >
      📄 View {artifact.path}
    </button>
  );
}
