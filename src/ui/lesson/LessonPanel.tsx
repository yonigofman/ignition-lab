import { useEffect, useState } from "react";
import Lesson0, { meta as lesson0Meta } from "../../lessons/00-concepts.mdx";
import Lesson1, { meta as lesson1Meta } from "../../lessons/01-upi-prerequisites.mdx";
import Lesson2, { meta as lesson2Meta } from "../../lessons/02-install-config-to-ignition.mdx";
import Lesson3, { meta as lesson3Meta } from "../../lessons/03-bootstrap-dance.mdx";
import { setLessonCommands } from "../../terminal/registry";

interface LessonMeta {
  title: string;
  module: number;
  commands: string[];
}

interface LessonModule {
  Content: (props: Record<string, never>) => JSX.Element;
  meta: LessonMeta;
}

const LESSONS: readonly [LessonModule, LessonModule, LessonModule, LessonModule] = [
  { Content: Lesson0, meta: lesson0Meta },
  { Content: Lesson1, meta: lesson1Meta },
  { Content: Lesson2, meta: lesson2Meta },
  { Content: Lesson3, meta: lesson3Meta },
];

export function LessonPanel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = LESSONS[activeIndex] ?? LESSONS[0];

  useEffect(() => {
    setLessonCommands(active.meta.commands);
    return () => setLessonCommands(null);
  }, [active]);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-(--border) bg-(--surface-muted)">
      <div className="flex items-center gap-1 border-b border-(--border) p-2">
        {LESSONS.map((lesson, index) => (
          <button
            key={lesson.meta.module}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`rounded px-2 py-1 text-xs ${
              index === activeIndex
                ? "bg-(--surface) text-(--text)"
                : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            {lesson.meta.module}. {lesson.meta.title}
          </button>
        ))}
      </div>
      <div className="lesson-content flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-(--text)">
        <active.Content />
      </div>
    </div>
  );
}
