import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7", className)}
      fill="none"
      aria-hidden
    >
      <rect x="6" y="4" width="20" height="7" rx="2.4" stroke="#D4AF37" strokeWidth="1.6" />
      <rect x="6" y="12.5" width="20" height="7" rx="2.4" stroke="#D4AF37" strokeWidth="1.6" opacity="0.7" />
      <rect x="6" y="21" width="20" height="7" rx="2.4" stroke="#D4AF37" strokeWidth="1.6" opacity="0.4" />
    </svg>
  );
}

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
      className={cn(
        "group inline-flex items-center gap-2.5 text-fg",
        className,
      )}
      aria-label={`${brand} - home`}
    >
      <LogoMark className="transition-transform duration-300 group-hover:rotate-3" />
      <span className="text-[15px] font-semibold tracking-tight">
        {first}
        {rest.length ? <span className="text-muted"> {rest.join(" ")}</span> : null}
      </span>
    </Link>
  );
}
