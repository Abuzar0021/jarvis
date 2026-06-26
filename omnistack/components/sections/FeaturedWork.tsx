import { Section, SectionHeading } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectCard } from "./ProjectCard";
import type { Project } from "@/lib/types";

export function FeaturedWork({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  return (
    <Section id="work" className="border-t border-hair">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="Selected work"
          title={<>Work we&rsquo;re proud to put our name on.</>}
          intro="A few of the products we've designed and shipped end to end."
        />
        <Reveal>
          <Button href="/work" variant="secondary" withArrow>
            View all work
          </Button>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={p.id} delay={(i % 2) * 0.08}>
            <ProjectCard project={p} large />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
