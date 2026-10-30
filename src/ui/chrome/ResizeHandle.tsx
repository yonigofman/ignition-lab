export interface ResizeHandleProps {
  axis: "x" | "y";
  onDragStart: (e: React.MouseEvent) => void;
}

/** A thin draggable divider between two panels, or above a drawer, for manual resizing. */
export function ResizeHandle({ axis, onDragStart }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onDragStart}
      className={
        axis === "x"
          ? "group w-1 shrink-0 cursor-col-resize bg-transparent"
          : "group h-1 w-full shrink-0 cursor-row-resize bg-transparent"
      }
    >
      <div
        className={
          axis === "x"
            ? "h-full w-px bg-(--border) transition-colors group-hover:bg-(--accent) group-active:bg-(--accent)"
            : "h-px w-full bg-(--border) transition-colors group-hover:bg-(--accent) group-active:bg-(--accent)"
        }
      />
    </div>
  );
}
