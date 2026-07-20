import {
  getFaqs,
  getFeaturedPosts,
  getFeaturedProjects,
  getIndustries,
  getServices,
  getSite,
  getTestimonials,
} from "@/lib/content";
import { ScrollScene } from "@/components/canvas/ScrollScene";
import { SideRail } from "@/components/canvas/SideRail";
import { getScene } from "@/lib/scenes";
import { ServicesAct } from "@/components/sections/ServicesAct";
import { WorkAct } from "@/components/sections/WorkAct";
import { AIAct } from "@/components/sections/AIAct";
import { ProofAct } from "@/components/sections/ProofAct";
import { HowWeWorkAct } from "@/components/sections/HowWeWorkAct";
import { IndustriesAct } from "@/components/sections/IndustriesAct";
import { ClosingAct } from "@/components/sections/ClosingAct";
import { TickerBand } from "@/components/sections/TickerBand";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { TechStack } from "@/components/sections/TechStack";
import { Testimonials } from "@/components/sections/Testimonials";
import { InsightsPreview } from "@/components/sections/InsightsPreview";
import { FAQ } from "@/components/sections/FAQ";
import { Newsletter } from "@/components/sections/Newsletter";

export const revalidate = 3600;

export const metadata = { alternates: { canonical: "/" } };

// The seven "Living Renaissance" painting scenes, each its own GSAP-pinned
// <ScrollScene> with the stardust shader reveal. Contact/Testimonials/Insights/
// FAQ stay in the lighter, non-pinned coda per the brief's own grouping.
const SCENE_COUNT = 7;

export default async function HomePage() {
  const [site, projects, services, testimonials, faqs, posts, industries] =
    await Promise.all([
      getSite(),
      getFeaturedProjects(3),
      getServices(),
      getTestimonials(),
      getFaqs(),
      getFeaturedPosts(3),
      getIndustries(),
    ]);

  const featuredServices = services.filter((s) => s.featured).slice(0, 6);
  const trustItems = [
    ...industries.map((i) => i.name),
    "Founders",
    "Agencies",
    "Scale-ups",
  ];

  return (
    <>
      <SideRail count={SCENE_COUNT} />

      <ScrollScene
        scene={getScene("hero")}
        eager
        eyebrow={site.hero.eyebrow}
        body={site.hero.subhead}
        meta={`${site.contact.responseTime} | ${site.contact.locations.map((l) => l.city).join(" & ")}`}
        primaryCta={site.hero.primaryCta}
        secondaryCta={site.hero.secondaryCta}
      />

      <ScrollScene scene={getScene("selected-work")} coord="SYS_REF // 00.02">
        <WorkAct projects={projects} />
      </ScrollScene>

      <ScrollScene scene={getScene("what-we-do")} coord="SYS_REF // 00.03">
        <ServicesAct intro={site.servicesIntro} services={featuredServices} />
      </ScrollScene>

      <ScrollScene scene={getScene("ai-native")} coord="SYS_REF // 00.04">
        <AIAct ai={site.aiShowcase} />
      </ScrollScene>

      <ScrollScene scene={getScene("by-the-numbers")} coord="SYS_REF // 00.05">
        <ProofAct stats={site.stats} trustLabel={site.trustLabel} />
      </ScrollScene>

      <ScrollScene scene={getScene("how-we-work")} coord="SYS_REF // 00.06">
        <HowWeWorkAct steps={site.process.steps} intro={site.process.intro} />
      </ScrollScene>

      <ScrollScene scene={getScene("industries")} coord="SYS_REF // 00.07">
        <IndustriesAct industries={industries} />
      </ScrollScene>

      <ClosingAct cta={site.cta} contact={site.contact} />

      {/* Coda: normal document scroll for the dense sections; footer follows (layout) */}
      <div className="relative z-10 bg-page">
        <TickerBand items={trustItems} />
        <ValuePillars pillars={site.valuePillars} />
        <TechStack groups={site.techStack} />
        <Testimonials items={testimonials} />
        <InsightsPreview posts={posts} />
        <FAQ faqs={faqs} />
        <Newsletter title={site.newsletter.title} body={site.newsletter.body} />
      </div>
    </>
  );
}
