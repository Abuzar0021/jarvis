"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { cn } from "@/lib/utils";

/**
 * The design's nav, plus the two routes it left out.
 *
 * The design ships four links. That looked right and ranked badly: it left the
 * 18 service pages and 6 industry pages reachable only from the footer, and
 * /work linked from no desktop nav at all. Services and Industries are back
 * because internal links are how those pages get crawled and weighted.
 *
 * An entry with an `id` is a homepage section. On the homepage it scrolls; off
 * it, it falls back to `href` if there is one, otherwise to "/#id". That is why
 * Work carries both: it scrolls to the pinned track on the homepage and routes
 * to the work index everywhere else.
 */
const NAV_LINKS: { label: string; id?: string; href?: string }[] = [
  { label: "Process", id: "process" },
  { label: "Services", href: "/services" },
  { label: "Industries", href: "/industries" },
  { label: "Templates", href: "/templates" },
  { label: "Pricing", href: "/pricing" },
  { label: "Work", id: "work", href: "/work" },
];

export function Nav({ brand, ctaLabel }: { brand: string; ctaLabel: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const onHome = pathname === "/";
  const to = (l: { id?: string; href?: string }) =>
    l.id && onHome ? `#${l.id}` : (l.href ?? `/#${l.id}`);

  useEffect(() => {
    // The design keeps the bar translucent over the first half-viewport, then
    // darkens it and firms up the hairline. Same rule on every route.
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          // z-50 so the bar, and the close button on it, stay above the open
          // menu panel at z-40.
          "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-[14px] transition-colors duration-[400ms]",
          scrolled || open
            ? "border-gold/[0.22] bg-page"
            : "border-gold/[0.12] bg-page/[0.4]",
        )}
      >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-5 sm:px-8 lg:px-16">
        <Logo brand={brand} />

        <div className="hidden items-center gap-[clamp(16px,3vw,40px)] lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={to(l)}
              aria-current={l.href && pathname.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "font-mono text-[11px] uppercase tracking-[0.2em] transition-colors",
                l.href && pathname.startsWith(l.href)
                  ? "text-fg"
                  : "text-muted hover:text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Responsive hiding lives on a wrapper, not on Magnetic, so the
              two display rules never fight. */}
          <div className="hidden sm:block">
            <Magnetic>
              <Button href={onHome ? "#cta" : "/#cta"} variant="primary" size="sm">
                {ctaLabel}
              </Button>
            </Magnetic>
          </div>
          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-hair text-fg transition-transform ease-snap active:scale-[0.94] lg:hidden"
          >
            <span className="sr-only">Menu</span>
            <div className="relative h-4 w-5">
              <span className={cn("absolute left-0 h-0.5 w-5 bg-current transition-all duration-300", open ? "top-1.5 rotate-45" : "top-0.5")} />
              <span className={cn("absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-all duration-300", open && "opacity-0")} />
              <span className={cn("absolute left-0 h-0.5 w-5 bg-current transition-all duration-300", open ? "top-1.5 -rotate-45" : "top-[11px]")} />
            </div>
          </button>
        </div>
        </nav>
      </header>

      {/* Mobile overlay. The design has no mobile menu, so this keeps the
          design links and adds Work index / Contact so those routes stay
          reachable without a desktop nav.

          It is a sibling of the header, not a child, and that is load bearing.
          The header carries backdrop-blur, and a backdrop-filter makes an
          element the containing block for fixed positioned descendants. Nested
          inside it, this panel resolved `inset-0 top-[73px]` against the 80px
          header instead of the viewport and came out seven pixels tall, so the
          links rendered over the page with almost no background behind them. */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="overlay"
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[73px] z-40 bg-page/[0.98] backdrop-blur-xl lg:hidden"
          >
            <div
              className="flex h-[calc(100dvh-73px)] flex-col overflow-y-auto px-5 py-8 sm:px-8"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <ul className="space-y-1">
                {[
                  ...NAV_LINKS,
                  { label: "All work", href: "/work" },
                  { label: "Contact", href: "/contact" },
                ].map((l, i) => (
                  <motion.li
                    key={l.label}
                    initial={reduce ? false : { opacity: 0, transform: "translateY(12px)" }}
                    animate={{ opacity: 1, transform: "translateY(0px)" }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={to(l)}
                      className="block border-b border-hair py-4 font-serif text-3xl font-light tracking-tight text-fg"
                    >
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Button
                  href={onHome ? "#cta" : "/#cta"}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  withArrow
                >
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
