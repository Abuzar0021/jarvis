import {
  getFaqs,
  getFeaturedPosts,
  getFeaturedProjects,
  getIndustries,
  getServices,
  getSite,
  getTestimonials,
} from "@/lib/content";
import { ScrollStage } from "@/components/canvas/ScrollStage";
import { Act } from "@/components/canvas/Act";
import { BlueprintGrid } from "@/components/canvas/BlueprintGrid";
import { HUD } from "@/components/canvas/HUD";
import { SideRail } from "@/components/canvas/SideRail";
import { ScrollScene } from "@/components/canvas/ScrollScene";
import { getScene } from "@/lib/scenes";
import { ServicesAct } from "@/components/sections/ServicesAct";
import { WorkAct } from "@/components/sections/WorkAct";
import { AIAct } from "@/components/sections/AIAct";
import { ProofAct } from "@/components/sections/ProofAct";
import { ClosingAct } from "@/components/sections/ClosingAct";
import { TickerBand } from "@/components/sections/TickerBand";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { Process } from "@/components/sections/Process";
import { TechStack } from "@/components/sections/TechStack";
import { Testimonials } from "@/components/sections/Testimonials";
import { Industries } from "@/components/sections/Industries";
import { InsightsPreview } from "@/components/sections/InsightsPreview";
import { FAQ } from "@/components/sections/FAQ";
import { Newsletter } from "@/components/sections/Newsletter";

export const revalidate = 3600;

export const metadata = { alternates: { canonical: "/" } };

// The Hero is its own GSAP-driven <ScrollScene> (Living Renaissance shader
// reveal); the remaining full-screen cinematic acts still live in the Framer
// wipe stage (one unit each), pending their own scene templating. The dense
// sections follow in a normal-scroll coda.
const UNITS = 5;

export default async function HomePage() {
  const [site, projects, services, testimonials, faqs, posts, industries] =
    await Promise.all([
      getSite(),
      getFeaturedProjects(4),
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

  const heroScene = getScene("hero");

  return (
    <>
      {/* Hero: GSAP ScrollTrigger-driven <ScrollScene> with the stardust shader */}
      <ScrollScene
        scene={heroScene}
        eager
        eyebrow={site.hero.eyebrow}
        body={site.hero.subhead}
        meta={`${site.contact.responseTime} | ${site.contact.locations.map((l) => l.city).join(" & ")}`}
        primaryCta={site.hero.primaryCta}
        secondaryCta={site.hero.secondaryCta}
      />

      {/* Fixed-canvas cinematic acts (Editions-style scroll wipe); pending
          templating onto their own <ScrollScene> per Part G's build order. */}
      <ScrollStage units={UNITS}>
        <BlueprintGrid />
        <HUD />
        <SideRail units={UNITS} />
        <Act unitStart={0} spanUnits={1} totalUnits={UNITS} art="/art/letter-scene.webp" coord="SYS_REF // 00.02">
          <ServicesAct intro={site.servicesIntro} services={featuredServices} />
        </Act>
        <Act unitStart={1} spanUnits={1} totalUnits={UNITS} art="/art/portrait-reading.webp" coord="SYS_REF // 00.03">
          <WorkAct projects={projects} />
        </Act>
        <Act unitStart={2} spanUnits={1} totalUnits={UNITS} art="/art/armor-portrait.webp" coord="SYS_REF // 00.04">
          <AIAct ai={site.aiShowcase} />
        </Act>
        <Act unitStart={3} spanUnits={1} totalUnits={UNITS} art="/art/portrait-mother.webp" coord="SYS_REF // 00.05">
          <ProofAct stats={site.stats} trustLabel={site.trustLabel} />
        </Act>
        <Act unitStart={4} spanUnits={1} totalUnits={UNITS} art="/art/forest-landscape.webp" coord="SYS_REF // 00.06">
          <ClosingAct cta={site.cta} contact={site.contact} />
        </Act>
      </ScrollStage>

      {/* Coda: normal document scroll for the dense sections; footer follows (layout) */}
      <div className="relative z-10 bg-page">
        <TickerBand items={trustItems} />
        <ValuePillars pillars={site.valuePillars} />
        <Process steps={site.process.steps} intro={site.process.intro} />
        <TechStack groups={site.techStack} />
        <Testimonials items={testimonials} />
        <Industries industries={industries} />
        <InsightsPreview posts={posts} />
        <FAQ faqs={faqs} />
        <Newsletter title={site.newsletter.title} body={site.newsletter.body} />
      </div>
    </>
  );
}
