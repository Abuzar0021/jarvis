import { getFeaturedProjects, getSite, getTestimonials } from "@/lib/content";
import { Hero } from "@/components/sections/Hero";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { Process } from "@/components/sections/Process";
import { Handover } from "@/components/sections/Handover";
import { WorkTrack } from "@/components/sections/WorkTrack";
import { Testimonials } from "@/components/sections/Testimonials";
import { Founder } from "@/components/sections/Founder";
import { ClosingAct } from "@/components/sections/ClosingAct";

export const revalidate = 3600;

export const metadata = { alternates: { canonical: "/" } };

/**
 * The homepage is the design one to one: hero, differentiators, process,
 * pinned case-study track, founder, closing CTA. Sections that used to live
 * here (services, AI, stats, industries, ticker, tech stack, testimonials,
 * insights, FAQ, newsletter) are not part of the design and were removed.
 */
export default async function HomePage() {
  const [site, projects, testimonials] = await Promise.all([
    getSite(),
    getFeaturedProjects(3),
    getTestimonials(),
  ]);

  // One quote only. The other two are already attached to their own case
  // studies, and a single pull-quote reads stronger here than a wall of them.
  const featuredQuote = testimonials.filter((t) => t.featured).slice(0, 1);

  return (
    <>
      <Hero
        brand={site.brand}
        eyebrow={site.hero.eyebrow}
        headline={site.hero.headline}
        highlight={site.hero.highlight}
        subhead={site.hero.subhead}
        primaryCta={site.hero.primaryCta}
        secondaryCta={site.hero.secondaryCta}
        meta={site.hero.note}
        annotations={site.hero.annotations}
      />

      <ValuePillars pillars={site.valuePillars} />
      <Process steps={site.process.steps} intro={site.process.intro} />
      {/* Not in the design, added deliberately: the site promises you own the
          code, so it should show what changes hands rather than assert it. */}
      <Handover />
      <WorkTrack projects={projects} />
      {/* Not in the design, added deliberately: proof belongs directly after
          the work, before the pitch turns back to the person selling it. */}
      <Testimonials items={featuredQuote} />
      <Founder
        about={site.about}
        founder={site.founder}
        locations={site.contact.locations}
      />
      <ClosingAct cta={site.cta} contact={site.contact} />
    </>
  );
}
