import type { Metadata } from "next";
import Link from "next/link";
import { getLocations, getSite } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/site/PageHeader";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Where We Work: Ireland, Malaysia, US",
  alternates: { canonical: "/locations" },
  description:
    "The markets OmniStack Digital builds for: Ireland from our Dublin base, Malaysia with delivered work in the market, and the United States remotely with business hours covered.",
};

export default async function LocationsPage() {
  const [locations, site] = await Promise.all([getLocations(), getSite()]);

  // Country-level entries lead; a state sits under its parent country rather
  // than competing with it in the index.
  const countries = locations.filter((l) => !l.parent);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: countries.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.name,
      url: `${SITE_URL}/locations/${l.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        crumb={{ label: "Locations", href: "/locations" }}
        eyebrow="Where we work"
        title={<>The markets we build for.</>}
        intro={`We run the studio from ${site.contact.locations.map((l) => l.city).join(" and ")}. Everywhere else is served remotely, and each page below says plainly which it is.`}
      />

      <Section>
        <div className="grid gap-5 lg:grid-cols-3">
          {countries.map((country) => {
            const states = locations.filter((l) => l.parent === country.slug);
            return (
              <div
                key={country.slug}
                className="flex flex-col rounded-2xl border border-hair bg-card p-7"
              >
                <Link
                  href={`/locations/${country.slug}`}
                  className="group block"
                >
                  <h2 className="display-serif m-0 text-[clamp(24px,2.6vw,34px)] text-fg transition-colors group-hover:text-gold">
                    {country.name}
                  </h2>
                  <p className="mt-3 text-pretty text-sm leading-[1.7] text-muted">
                    {country.summary}
                  </p>
                </Link>

                <p className="mt-5 text-[13px] leading-[1.65] text-muted/80">
                  {country.presence}
                </p>

                {states.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-hair pt-5">
                    {states.map((state) => (
                      <Link
                        key={state.slug}
                        href={`/locations/${state.slug}`}
                        className="rounded-full border border-hair px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-gold/40 hover:text-fg"
                      >
                        {state.name}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <Link
                  href={`/locations/${country.slug}`}
                  className="mt-auto pt-6 text-sm text-gold underline-offset-4 transition-opacity hover:underline hover:opacity-80"
                >
                  Working with us in {country.name}
                </Link>
              </div>
            );
          })}
        </div>
      </Section>

      <CTABand site={site} />
    </>
  );
}
