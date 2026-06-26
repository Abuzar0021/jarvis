import type { Metadata } from "next";
import { getProjects, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { CTABand } from "@/components/sections/CTABand";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Work",
  alternates: { canonical: "/work" },
  description:
    "Selected products we've designed and engineered end to end — websites, web apps, and AI.",
};

export default async function WorkPage() {
  const [projects, site] = await Promise.all([getProjects(), getSite()]);

  return (
    <>
      <PageHeader
        eyebrow="Selected work"
        title={<>Products we&rsquo;re proud to put our name on.</>}
        intro="Every project here was designed, built, and shipped by one senior team — from the first sketch to the last deploy."
      />

      <Section>
        {projects.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((p, i) => (
              <Reveal key={p.id} delay={(i % 2) * 0.08}>
                <ProjectCard project={p} large />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-muted">Projects are on the way. Check back soon.</p>
        )}
      </Section>

      <CTABand site={site} />
    </>
  );
}
