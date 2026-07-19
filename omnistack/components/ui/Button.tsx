import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "solid" | "light" | "lightOutline";
type Size = "sm" | "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "border border-gold/60 bg-gold-soft text-fg hover:border-gold hover:bg-gold/15 hover:-translate-y-0.5 shadow-[0_0_0_0_rgba(27,22,14,0)] hover:shadow-[0_8px_30px_-12px_rgba(27,22,14,0.22)]",
  solid:
    "bg-fg text-[#f2efe6] hover:bg-fg/90 hover:-translate-y-0.5",
  secondary:
    "border border-hair bg-transparent text-fg hover:border-fg/40 hover:bg-fg/5",
  ghost: "text-fg hover:text-gold",
  // Light-on-dark variants for the full-bleed painting acts.
  light:
    "bg-[#f4f1ea] text-[#141019] hover:bg-white hover:-translate-y-0.5 shadow-[0_14px_44px_-14px_rgba(0,0,0,0.6)]",
  lightOutline:
    "border border-white/35 bg-white/5 text-[#f4f1ea] backdrop-blur-sm hover:border-white/70 hover:bg-white/12",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
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
      className="transition-transform duration-200 group-hover:translate-x-0.5"
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
