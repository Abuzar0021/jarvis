import { ScrollExpandMedia } from "@/components/ui/ScrollExpandMedia";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/types";

/**
 * Cinematic scroll-gated intro built around the FitPlanCoach case study.
 * Must stay the first element on the page — see ScrollExpandMedia's own
 * doc comment for why.
 */
export function CaseStudyReveal({ project }: { project: Project }) {
  return (
    <ScrollExpandMedia
      mediaType="image"
      mediaSrc="/media/fitplancoach-real.webp"
      title="Coaching, made scalable."
      date={`${project.category} · ${project.year}`}
      scrollToExpand="Scroll to see the work"
    >
      <Container className="pb-24 pt-4 sm:pb-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-lg leading-relaxed text-muted">{project.approach}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href={`/work/${project.slug}`} variant="primary" withArrow>
              View the full case study
            </Button>
            <Button href={project.url} variant="secondary">
              Visit live site
            </Button>
          </div>
        </div>
      </Container>
    </ScrollExpandMedia>
  );
}
