"use client";

import { motion } from "framer-motion";

export function HilalMoon({
  illuminationFraction,
  visible,
}: {
  illuminationFraction: number;
  visible: boolean;
}) {
  const size = 140;
  const center = size / 2;
  const r = size / 2 - 18;
  // Purely illustrative crescent thickness - not a precision phase render,
  // the exact illumination number is shown numerically alongside this.
  const shift = r * (1.9 - Math.min(illuminationFraction, 0.15) * 4);

  const maskId = "hilal-mask";
  const glowId = "hilal-glow";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.1 }}
      className="relative flex items-center justify-center"
    >
      {/* Decorative: the illumination fraction and the verdict this drawing
          depicts are both stated as text immediately beside it, so announcing
          the graphic as well would repeat them. */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="hilal-face" cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor={visible ? "#f8e6b8" : "#c7cbd6"} />
            <stop offset="100%" stopColor={visible ? "#e8c164" : "#8b93a8"} />
          </radialGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width={size} height={size} fill="black" />
            <circle cx={center} cy={center} r={r} fill="white" />
            <circle cx={center + shift} cy={center} r={r} fill="black" />
          </mask>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {visible && (
          <motion.circle
            cx={center}
            cy={center}
            r={r}
            mask={`url(#${maskId})`}
            fill="#e8c164"
            filter={`url(#${glowId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <circle
          cx={center}
          cy={center}
          r={r}
          mask={`url(#${maskId})`}
          fill="url(#hilal-face)"
        />
      </svg>
    </motion.div>
  );
}
