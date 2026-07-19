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
import { Hero } from "@/components/sections/Hero";
import { ServicesAct } from "@/components/sections/ServicesAct";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { WorkAct } from "@/components/sections/WorkAct";
import { AIAct } from "@/components/sections/AIAct";
import { Process } from "@/components/sections/Process";
import { TechStack } from "@/components/sections/TechStack";
import { Stats } from "@/components/sections/Stats";
import { Testimonials } from "@/components/sections/Testimonials";
import { Industries } from "@/components/sections/Industries";
import { InsightsPreview } from "@/components/sections/InsightsPreview";
import { FAQ } from "@/components/sections/FAQ";
import { CTABand } from "@/components/sections/CTABand";
import { Newsletter } from "@/components/sections/Newsletter";

export const revalidate = 3600;

export const metadata = { alternates: { canonical: "/" } };

// Full-screen cinematic acts live in the pinned wipe stage (one unit each). The
// dense sections follow in a normal-scroll coda.
const UNITS = 4;

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

  return (
    <>
      {/* Fixed-canvas cinematic acts (Editions-style scroll wipe) */}
      <ScrollStage units={UNITS}>
        <BlueprintGrid />
        <HUD />
        <Act unitStart={0} spanUnits={1} totalUnits={UNITS} art="/art/portrait-dinner.webp" coord="SYS_REF // 00.01">
          <Hero site={site} />
        </Act>
        <Act unitStart={1} spanUnits={1} totalUnits={UNITS} art="/art/letter-scene.webp" coord="SYS_REF // 00.02">
          <ServicesAct intro={site.servicesIntro} services={featuredServices} />
        </Act>
        <Act unitStart={2} spanUnits={1} totalUnits={UNITS} art="/art/portrait-reading.webp" coord="SYS_REF // 00.03">
          <WorkAct projects={projects} />
        </Act>
        <Act unitStart={3} spanUnits={1} totalUnits={UNITS} art="/art/armor-portrait.webp" coord="SYS_REF // 00.04">
          <AIAct ai={site.aiShowcase} />
        </Act>
      </ScrollStage>

      {/* Coda: normal document scroll for the dense sections; footer follows (layout) */}
      <div className="relative z-10 bg-page">
        <TrustStrip label={site.trustLabel} items={trustItems} />
        <ValuePillars pillars={site.valuePillars} />
        <Process steps={site.process.steps} intro={site.process.intro} />
        <TechStack groups={site.techStack} />
        <Stats stats={site.stats} />
        <Testimonials items={testimonials} />
        <Industries industries={industries} />
        <InsightsPreview posts={posts} />
        <FAQ faqs={faqs} />
        <CTABand site={site} />
        <Newsletter title={site.newsletter.title} body={site.newsletter.body} />
      </div>
    </>
  );
}
