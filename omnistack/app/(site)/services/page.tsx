import type { Metadata } from "next";
import Link from "next/link";
import { getServices, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { CTABand } from "@/components/sections/CTABand";
import type { ServiceGroup } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Full-stack capability under one senior team — Build, AI, Design, and Grow. Everything you need to ship a modern digital product.",
};

const GROUP_ORDER: ServiceGroup[] = ["Build", "AI", "Design", "Grow"];
const GROUP_BLURB: Record<ServiceGroup, string> = {
  Build: "Websites, apps, and platforms engineered to scale.",
  AI: "Agents and automations that do real work in production.",
  Design: "Identity and interfaces with restraint and intent.",
  Grow: "Traffic, rankings, and conversions that compound.",
};

export default async function ServicesPage() {
  const [services, site] = await Promise.all([getServices(), getSite()]);

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title={<>One team for brand, product, and growth.</>}
        intro={site.servicesIntro}
      />

      {GROUP_ORDER.map((group) => {
        const items = services.filter((s) => s.group === group);
        if (!items.length) return null;
        return (
          <Section key={group} className="border-t border-hair">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-3">
                <h2 className="text-2xl font-semibold tracking-tight">{group}</h2>
                <p className="mt-2 text-sm text-muted">{GROUP_BLURB[group]}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-9">
                {items.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 2) * 0.06}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-hair bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(212,175,55,0.4)]"
                    >
                      <h3 className="text-lg font-semibold tracking-tight">{s.name}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.summary}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold">
                        Learn more <span aria-hidden>→</span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </Section>
        );
      })}

      <CTABand site={site} />
    </>
  );
}
