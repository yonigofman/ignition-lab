export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
        <path
          d="M10 1.5c1 3 .5 4.5-1 6-1.8 1.8-2.3 3.6-1.3 5.6A4 4 0 1 0 14.5 11c0-2-1-3.3-2-4.3-1.2-1.2-2-2.7-2.5-5.2Z"
          fill="url(#flame)"
        />
        <defs>
          <linearGradient id="flame" x1="10" y1="1.5" x2="10" y2="16" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-base font-bold tracking-tight text-(--text)">Ignition</span>
    </div>
  );
}
