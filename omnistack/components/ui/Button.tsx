import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "solid" | "light" | "lightOutline";
type Size = "sm" | "md" | "lg";

// The design's buttons are letterspaced uppercase pills: a solid gold primary
// with a warm shadow, and a hairline-outlined secondary that golds on hover.
const base =
  "group inline-flex items-center justify-center gap-3 rounded-full font-semibold uppercase tracking-[0.08em] transition-all duration-300 ease-snap active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-page shadow-[0_12px_40px_rgba(198,161,91,.24)] hover:bg-gold-bright hover:shadow-[0_18px_60px_rgba(233,200,121,.4)]",
  solid:
    "bg-gold-bright text-page shadow-[0_16px_60px_rgba(233,200,121,.34)] hover:bg-fg",
  secondary:
    "border border-fg/20 bg-transparent text-fg hover:border-gold hover:text-gold-bright",
  ghost: "text-fg hover:text-gold-bright",
  // Kept for surfaces that sit on their own light plate.
  light:
    "bg-fg text-page hover:bg-gold-bright shadow-[0_14px_44px_-14px_rgba(0,0,0,0.6)]",
  lightOutline:
    "border border-fg/25 bg-fg/5 text-fg backdrop-blur-sm hover:border-gold hover:text-gold-bright",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-5 text-[11px]",
  md: "h-11 px-6 text-xs",
  lg: "h-14 px-[30px] text-[13px]",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
  withArrow?: boolean;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="transition-transform duration-200 ease-snap group-hover:translate-x-0.5"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  withArrow,
  ...rest
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");
    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {children}
          {withArrow ? <Arrow /> : null}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
        {withArrow ? <Arrow /> : null}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
      {withArrow ? <Arrow /> : null}
    </button>
  );
}
