import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The stacked-bars mark. Strokes use currentColor and default to the gold
 * token, so it picks up the admin palette's gold inside [data-admin-theme]
 * without a second copy of the SVG.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7 text-gold", className)}
      fill="none"
      aria-hidden
    >
      <rect x="6" y="4" width="20" height="7" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="6" y="12.5" width="20" height="7" rx="2.4" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
      <rect x="6" y="21" width="20" height="7" rx="2.4" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
    </svg>
  );
}

/**
 * The design's lockup: a small rotated gold diamond with a soft halo, then the
 * brand set in tiny, widely letterspaced caps.
 */
export function Logo({
  brand,
  className,
}: {
  brand: string;
  className?: string;
}) {
  const [first, ...rest] = brand.split(" ");
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-3 text-fg", className)}
      aria-label={`${brand} - home`}
    >
      <span
        aria-hidden
        className="block h-[11px] w-[11px] rotate-45 border border-gold shadow-[0_0_14px_rgba(198,161,91,.6)] transition-transform duration-500 group-hover:rotate-[135deg]"
      />
      <span className="text-xs font-medium uppercase tracking-[0.34em]">
        {first}
        {rest.length ? (
          <span className="text-muted"> {rest.join(" ")}</span>
        ) : null}
      </span>
    </Link>
  );
}
