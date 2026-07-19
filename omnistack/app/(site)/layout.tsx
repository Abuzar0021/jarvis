import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PageTransition } from "@/components/motion/PageTransition";
import { getServices, getSite } from "@/lib/content";
import type { ServiceGroup } from "@/lib/types";

const GROUP_ORDER: ServiceGroup[] = ["Build", "AI", "Design", "Grow"];

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, services] = await Promise.all([getSite(), getServices()]);

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: services
      .filter((s) => s.group === group)
      .map((s) => ({ name: s.name, slug: s.slug })),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SmoothScroll />
      <span id="top" aria-hidden />
      <a
        href="#main"
        className="sr-only rounded-lg focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:border focus-visible:border-gold focus-visible:bg-surface focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:text-fg"
      >
        Skip to content
      </a>
      <AnnouncementBar
        enabled={site.announcement.enabled}
        text={site.announcement.text}
        linkLabel={site.announcement.linkLabel}
        linkHref={site.announcement.linkHref}
      />
      <Nav brand={site.brand} grouped={grouped} ctaLabel={site.hero.primaryCta.label} />
      <main id="main" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer site={site} services={services} />
      <WhatsAppButton whatsapp={site.contact.whatsapp} brand={site.brand} />
    </>
  );
}
