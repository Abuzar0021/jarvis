import {
  getFaqs,
  getFeaturedPosts,
  getFeaturedProjects,
  getServices,
  getSite,
  getTestimonials,
} from "@/lib/content";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { ValuePillars } from "@/components/sections/ValuePillars";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [site, projects, services, testimonials, faqs, posts] = await Promise.all([
    getSite(),
    getFeaturedProjects(4),
    getServices(),
    getTestimonials(),
    getFaqs(),
    getFeaturedPosts(3),
  ]);

  const featuredServices = services.filter((s) => s.featured).slice(0, 6);
  const trustItems = [
    ...site.industries.map((i) => i.name),
    "Founders",
    "Agencies",
    "Scale-ups",
  ];

  return (
    <>
      <Hero site={site} />
      <TrustStrip label={site.trustLabel} items={trustItems} />
      <ValuePillars pillars={site.valuePillars} />
      <ServicesGrid services={featuredServices} intro={site.servicesIntro} />
      <FeaturedWork projects={projects} />
      <AIShowcase site={site} />
      <Process steps={site.process.steps} intro={site.process.intro} />
      <TechStack groups={site.techStack} />
      <Stats stats={site.stats} />
      <Testimonials items={testimonials} />
      <Industries industries={site.industries} />
      <InsightsPreview posts={posts} />
      <FAQ faqs={faqs} />
      <CTABand site={site} />
      <Newsletter title={site.newsletter.title} body={site.newsletter.body} />
    </>
  );
}
