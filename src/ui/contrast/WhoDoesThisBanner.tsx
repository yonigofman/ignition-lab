import type { WhoDoesThisView } from "./deriveWhoDoesThisView";

export interface WhoDoesThisBannerProps {
  view: WhoDoesThisView;
}

export function WhoDoesThisBanner({ view }: WhoDoesThisBannerProps) {
  const { active } = view;
  if (!active) return null;

  return (
    <div className="flex items-center gap-2 border-t border-fuchsia-500/60 bg-fuchsia-500/10 px-4 py-2 text-sm">
      <span className="shrink-0 rounded bg-fuchsia-500 px-1.5 py-0.5 text-xs font-semibold text-black">
        {active.actor === "installer" ? "🤖 INSTALLER" : "🧑 LEARNER"}
      </span>
      <span className="text-fuchsia-300">{active.contrastNote}</span>
    </div>
  );
}
