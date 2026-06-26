import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
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
      <span id="top" aria-hidden />
      <AnnouncementBar
        enabled={site.announcement.enabled}
        text={site.announcement.text}
        linkLabel={site.announcement.linkLabel}
        linkHref={site.announcement.linkHref}
      />
      <Nav brand={site.brand} grouped={grouped} ctaLabel={site.hero.primaryCta.label} />
      <main className="flex-1">{children}</main>
      <Footer site={site} services={services} />
      <WhatsAppButton whatsapp={site.contact.whatsapp} brand={site.brand} />
    </>
  );
}
