"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ServiceLink = { name: string; slug: string };
type Grouped = { group: string; items: ServiceLink[] }[];

const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
];

export function Nav({
  brand,
  grouped,
  ctaLabel,
}: {
  brand: string;
  grouped: Grouped;
  ctaLabel: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [heroDark, setHeroDark] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]);

  useEffect(() => {
    // Pages with a full-bleed hero mark it [data-nav-hero]: the nav stays
    // transparent over it and gains its blur/tint once you scroll past. When
    // that hero is a dark canvas ([data-nav-tone="dark"]) the transparent nav
    // switches to light text so it reads over the paintings. A page can chain
    // several dark sentinels back to back (e.g. the Hero ScrollScene followed
    // by the Editions wipe stage) - they're treated as one continuous dark run.
    const heroes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-nav-hero]"),
    );
    const onScroll = () => {
      setHeroDark(heroes[0]?.getAttribute("data-nav-tone") === "dark");
      // Stay transparent over the whole run (each section can be many
      // viewports tall); flip to the blur bar once it has all scrolled past.
      const runHeight = heroes.reduce((sum, el) => sum + el.offsetHeight, 0);
      const threshold = runHeight ? Math.max(runHeight - window.innerHeight, 8) : 8;
      setScrolled(window.scrollY > threshold);
    };
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

  // Light-on-dark treatment while transparent over a dark canvas hero.
  const light = heroDark && !scrolled && !open;

  const linkClass = (active: boolean) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm transition-colors",
      light
        ? active
          ? "text-white"
          : "text-white/70 hover:text-white"
        : active
          ? "text-fg"
          : "text-muted hover:text-fg",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "border-b border-hair bg-surface/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Logo brand={brand} tone={light ? "light" : "dark"} />

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          <div className="group/services relative">
            <Link
              href="/services"
              aria-current={isActive("/services") ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5",
                linkClass(isActive("/services")),
              )}
            >
              Services
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="mt-0.5 transition-transform group-hover/services:rotate-180">
                <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {/* Mega menu */}
            <div className="invisible absolute left-1/2 top-full z-50 w-[680px] -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover/services:visible group-hover/services:opacity-100 group-focus-within/services:visible group-focus-within/services:opacity-100">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-2xl border border-hair bg-card/95 p-6 shadow-2xl backdrop-blur-xl">
                {grouped.map((g) => (
                  <div key={g.group}>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                      {g.group}
                    </p>
                    <ul className="space-y-0.5">
                      {g.items.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/services/${s.slug}`}
                            className="block rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-fg/5 hover:text-fg"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="col-span-2 border-t border-hair pt-4">
                  <Link
                    href="/services"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:underline"
                  >
                    Explore all services
                    <span aria-hidden>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={linkClass(isActive(l.href))}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label="Search"
            className={cn(
              "hidden h-10 w-10 items-center justify-center rounded-full border transition-colors lg:flex",
              light
                ? "border-white/25 text-white/70 hover:border-white/60 hover:text-white"
                : "border-hair text-muted hover:border-gold/50 hover:text-fg",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
          <Button
            href="/book"
            variant={light ? "light" : "primary"}
            size="sm"
            className="hidden sm:inline-flex"
          >
            {ctaLabel}
          </Button>
          {/* Mobile toggle */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "relative z-50 flex h-10 w-10 items-center justify-center rounded-full border lg:hidden",
              light ? "border-white/25 text-white" : "border-hair text-fg",
            )}
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

      {/* Mobile overlay */}
      <AnimatePresence>
        {open ? (
          <motion.div
            key="overlay"
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[68px] z-40 bg-page/98 backdrop-blur-xl lg:hidden"
          >
            <div
              className="flex h-[calc(100dvh-68px)] flex-col overflow-y-auto px-5 py-8 sm:px-8"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <ul className="space-y-1">
                {[{ label: "Services", href: "/services" }, ...NAV_LINKS, { label: "Contact", href: "/contact" }, { label: "Search", href: "/search" }].map(
                  (l, i) => (
                    <motion.li
                      key={l.href}
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.3 }}
                    >
                      <Link
                        href={l.href}
                        aria-current={isActive(l.href) ? "page" : undefined}
                        className={cn(
                          "block border-b border-hair py-4 text-2xl font-medium tracking-tight",
                          isActive(l.href) ? "text-gold" : "text-fg",
                        )}
                      >
                        {l.label}
                      </Link>
                    </motion.li>
                  ),
                )}
              </ul>
              <div className="mt-auto pt-8">
                <Button href="/book" variant="primary" size="lg" className="w-full" withArrow>
                  {ctaLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
