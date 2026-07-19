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
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { AIShowcase } from "@/components/sections/AIShowcase";
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

// Full-screen cinematic acts live in the pinned wipe stage; the dense sections
// follow in a normal-scroll coda. Grows as more acts are converted from coda.
const ACTS = 2;

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
      <ScrollStage acts={ACTS}>
        <BlueprintGrid />
        <HUD />
        <Act index={0} acts={ACTS} art="/art/portrait-dinner.webp" coord="SYS_REF // 00.01">
          <Hero site={site} />
        </Act>
        <Act index={1} acts={ACTS} art="/art/letter-scene.webp" coord="SYS_REF // 00.02">
          <ServicesAct intro={site.servicesIntro} services={featuredServices} />
        </Act>
      </ScrollStage>

      {/* Coda: normal document scroll for the dense sections; footer follows (layout) */}
      <div className="relative z-10 bg-page">
        <TrustStrip label={site.trustLabel} items={trustItems} />
        <ValuePillars pillars={site.valuePillars} />
        <FeaturedWork projects={projects} />
        <AIShowcase site={site} />
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
