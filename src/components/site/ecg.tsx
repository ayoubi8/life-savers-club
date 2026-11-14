/** Animated heartbeat line, drawn once on load. */
export function Ecg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 120" fill="none" className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ecg-g" x1="0" x2="1">
          <stop offset="0" stopColor="#2d74ba" />
          <stop offset="0.55" stopColor="#ef4a6c" />
          <stop offset="1" stopColor="#6ebd45" />
        </linearGradient>
      </defs>
      <path
        className="ecg-path"
        d="M0 60 H210 L235 60 L255 20 L285 100 L310 8 L335 60 H470 L490 60 L505 38 L525 82 L540 60 H800"
        stroke="url(#ecg-g)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
