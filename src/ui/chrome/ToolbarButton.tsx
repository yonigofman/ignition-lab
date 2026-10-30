import type { ReactNode } from "react";

export interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}

const ACTIVE_CLASS = "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400";
const INACTIVE_CLASS = "border-(--border) text-(--text-muted) hover:border-(--text-muted) hover:text-(--text)";

/** The header's toggle buttons (Terminal, Files, "Who does this?", demo mode, ...) all share this treatment, so a new toggle never means copy-pasting the className string again. */
export function ToolbarButton({ onClick, active = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 text-xs transition-colors ${active ? ACTIVE_CLASS : INACTIVE_CLASS}`}
    >
      {children}
    </button>
  );
}
