import type { Metadata } from "next";
import Link from "next/link";
import { getTemplates, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { CTABand } from "@/components/sections/CTABand";
import { TemplateCard } from "@/components/sections/TemplateCard";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Templates",
  alternates: { canonical: "/templates" },
  description:
    "Starting points you can point at and say build me that. Every template is a working page, not a picture, and whatever we build from one is yours outright.",
};

export default async function TemplatesPage() {
  const [templates, site] = await Promise.all([getTemplates(), getSite()]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: templates.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/templates/${t.slug}`,
      name: t.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        eyebrow="Templates"
        title={
          <>
            Starting points, not <span className="serif-accent text-gold">stock</span>.
          </>
        }
        intro="Directions we have already built and can build again for you. Open any one and it runs: real scrolling, real motion, on your own phone. Nothing here is a client project, and nothing here is sold as a theme."
      />

      <Section>
        {templates.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {templates.map((t, i) => (
              <Reveal key={t.id} delay={(i % 2) * 0.08}>
                <TemplateCard template={t} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-muted">The first templates are on the way.</p>
        )}
      </Section>

      {/* Said plainly and early, because a gallery of good looking pages is
          exactly where somebody assumes they are buying a theme. */}
      <Section className="border-t border-hair">
        <div className="mx-auto max-w-[52em]">
          <div className="eyebrow mb-4">How these work</div>
          <h2 className="display-serif m-0 text-[clamp(24px,3vw,38px)] text-fg">
            A direction to react to, not a product to buy.
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-[1.75] text-muted">
            <p>
              Choosing from nothing is hard, and describing a feeling in an email
              is harder. These exist so you can open one, scroll it, and tell us
              which parts you want and which you do not.
            </p>
            <p>
              None of them is sold as a template. We do not license these, and we
              do not drop your content into one and call it a site. Your build
              starts from the direction you liked and is drawn around your own
              content, brand and structure.
            </p>
            <p>
              What does not change is the part that matters: whatever we build
              from here, you get the code, the repository, the domain and the
              hosting account, with no monthly platform fee.{" "}
              <Link href="/pricing" className="text-gold underline-offset-4 hover:underline">
                See what that costs
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>

      <CTABand site={site} />
    </>
  );
}
