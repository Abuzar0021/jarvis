"use client";

import { useStage } from "./StageContext";

/**
 * Full-screen technical blueprint grid drawn over the pinned stage: 1px lines at
 * ~5% opacity, pointer-events-none so act controls stay clickable. Hidden in the
 * reduced-motion / mobile fallback, where the calm stacked layout owns the look.
 */
export function BlueprintGrid() {
  const { fallback } = useStage();
  if (fallback) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40" aria-hidden>
      <svg className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="bp-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M64 0H0V64"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.05"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />
      </svg>
    </div>
  );
}
