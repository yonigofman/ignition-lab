import { useCallback, useRef, useState } from "react";

export interface Resizable {
  size: number;
  onDragStart: (e: React.MouseEvent) => void;
}

/**
 * A single draggable dimension (width or height), clamped to [min, max].
 * `direction` controls which way growing the drag delta should grow `size` -
 * e.g. a handle on a panel's left edge grows the panel as the pointer moves left.
 */
export function useResizable(initial: number, min: number, max: number, direction: "grow-left" | "grow-right" | "grow-up" | "grow-down"): Resizable {
  const [size, setSize] = useState(initial);
  const startRef = useRef({ pos: 0, size: initial });

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const isVertical = direction === "grow-up" || direction === "grow-down";
      startRef.current = { pos: isVertical ? e.clientY : e.clientX, size };

      const onMove = (moveEvent: MouseEvent) => {
        const pos = isVertical ? moveEvent.clientY : moveEvent.clientX;
        const delta = pos - startRef.current.pos;
        const signedDelta = direction === "grow-left" || direction === "grow-up" ? -delta : delta;
        setSize(Math.min(max, Math.max(min, startRef.current.size + signedDelta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [size, min, max, direction]
  );

  return { size, onDragStart };
}
