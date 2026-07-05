export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M20.5 4.5a12 12 0 1 0 7 15.6 9.5 9.5 0 0 1-7-15.6Z"
        fill="url(#falak-crescent)"
      />
      <path
        d="M24.5 8.5l0.8 1.9 1.9 0.8-1.9 0.8-0.8 1.9-0.8-1.9-1.9-0.8 1.9-0.8z"
        fill="url(#falak-star)"
      />
      <defs>
        <linearGradient id="falak-crescent" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2d68a" />
          <stop offset="1" stopColor="#b9862a" />
        </linearGradient>
        <linearGradient id="falak-star" x1="21.5" y1="8.5" x2="27.2" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7dd3c8" />
          <stop offset="1" stopColor="#4fb3a6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
