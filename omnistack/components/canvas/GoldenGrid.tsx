import { forwardRef } from "react";

const PHI = 0.618;
const RAYS: Array<[number, number]> = [
  [0, 0],
  [100, 0],
  [0, 100],
  [100, 100],
  [50, 0],
  [50, 100],
  [0, 50],
  [100, 50],
];

/**
 * Hero-only extra (Part E): a thin golden-ratio grid with lines radiating to a
 * central vanishing point, drawn over black before the painting resolves. The
 * ScrollScene driving this converges/dissolves it via direct style mutation on
 * the forwarded ref (opacity + scale), keeping it out of React's render loop.
 */
export const GoldenGrid = forwardRef<HTMLDivElement>(function GoldenGrid(_, ref) {
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <line x1={PHI * 100} y1="0" x2={PHI * 100} y2="100" stroke="rgba(255,255,255,.2)" strokeWidth="0.15" />
        <line x1={(1 - PHI) * 100} y1="0" x2={(1 - PHI) * 100} y2="100" stroke="rgba(255,255,255,.2)" strokeWidth="0.15" />
        <line x1="0" y1={PHI * 100} x2="100" y2={PHI * 100} stroke="rgba(255,255,255,.2)" strokeWidth="0.15" />
        <line x1="0" y1={(1 - PHI) * 100} x2="100" y2={(1 - PHI) * 100} stroke="rgba(255,255,255,.2)" strokeWidth="0.15" />
        {RAYS.map(([x, y]) => (
          <line key={`${x}-${y}`} x1={x} y1={y} x2="50" y2="50" stroke="rgba(255,255,255,.14)" strokeWidth="0.1" />
        ))}
        <circle cx="50" cy="50" r="0.6" fill="rgba(255,255,255,.5)" />
      </svg>
    </div>
  );
});
