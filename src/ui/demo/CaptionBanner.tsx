import type { CaptionView } from "./deriveCaptionView";

export interface CaptionBannerProps {
  view: CaptionView;
}

export function CaptionBanner({ view }: CaptionBannerProps) {
  if (!view.caption) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
      <div className="pointer-events-auto rounded-full border border-(--border) bg-(--surface)/90 px-5 py-2 text-sm font-medium text-(--text) shadow-lg backdrop-blur">
        {view.caption}
      </div>
    </div>
  );
}
