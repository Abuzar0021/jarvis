import Link from "next/link";
import type { Project } from "@/lib/types";
import { coverGradient } from "@/lib/utils";
import { Spotlight } from "@/components/motion/Spotlight";

export function ProjectCard({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-hair bg-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(212,175,55,0.4)]"
    >
      <Spotlight />
      <div
        className={`relative overflow-hidden ${large ? "aspect-[16/10]" : "aspect-[16/11]"}`}
        style={{ background: coverGradient(project.slug) }}
      >
        {project.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover}
            alt={`${project.title} — ${project.category}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-between p-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
              {project.category}
            </span>
            <span className="max-w-[80%] text-2xl font-semibold leading-tight tracking-tight text-fg/90">
              {project.title}
            </span>
          </div>
        )}
        {project.results.length > 0 ? (
          <div className="absolute bottom-4 right-4 rounded-full border border-gold/40 bg-base/70 px-3 py-1 font-mono text-xs text-gold backdrop-blur">
            {project.results[0].value} {project.results[0].label}
          </div>
        ) : null}
        {project.logo ? (
          <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-hair bg-fg/95 p-1.5 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.logo} alt={`${project.client || project.title} logo`} className="h-full w-full object-contain" />
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{project.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{project.summary}</p>
        </div>
        <span className="mt-1 shrink-0 text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold">
          →
        </span>
      </div>
    </Link>
  );
}
