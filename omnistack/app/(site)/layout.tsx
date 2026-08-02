import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PageTransition } from "@/components/motion/PageTransition";
import { CursorGlow } from "@/components/motion/CursorGlow";
import { Toaster } from "@/components/motion/Toast";
import { Sculpture } from "@/components/canvas/Sculpture";
import { getServices, getSite } from "@/lib/content";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, services] = await Promise.all([getSite(), getServices()]);

  return (
    <>
      <SmoothScroll />
      <span id="top" aria-hidden />

      {/* Fixed atmosphere layers, behind all content. Order matches the
          design: grain film on top, cursor glow under it, sculpture beneath. */}
      <div
        aria-hidden
        className="grain pointer-events-none fixed inset-0 z-[6] opacity-50"
      />
      <CursorGlow />
      <Sculpture />
      <a
        href="#main"
        className="sr-only rounded-lg focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:border focus-visible:border-gold focus-visible:bg-surface focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-fg"
      >
        Skip to content
      </a>
      <Nav brand={site.brand} ctaLabel={site.hero.primaryCta.label} />
      {/* z-3 keeps page content above the sculpture (z-1) and glow (z-2),
          and below the grain film (z-6) and nav (z-20). */}
      <main id="main" className="relative z-[3] flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer site={site} services={services} />
      {/* Not in the design. Kept because Dublin and Jakarta clients start on
          WhatsApp, and a removed contact channel is a removed lead. */}
      <WhatsAppButton whatsapp={site.contact.whatsapp} brand={site.brand} />
      <Toaster />
    </>
  );
}
