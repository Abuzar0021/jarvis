"use client";

import Link from "next/link";
import { motion, useTransform } from "motion/react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useStage } from "@/components/canvas/StageContext";
import { coverGradient } from "@/lib/utils";
import type { Project } from "@/lib/types";

const EYEBROW = "Selected work";
const HEADLINE = "Work we're proud to put our name on.";
const INTRO = "A few of the products we've designed and shipped end to end.";

const ROTATIONS = [-6, 5];
const STAGE_LABELS = ["Challenge", "Approach", "Outcome"] as const;
const STAGE_KEYS = ["challenge", "approach", "outcome"] as const;
type StageKey = (typeof STAGE_KEYS)[number];

/** Cover image + client/category header, shared by every project spread. */
function CoverCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      className="group block overflow-hidden rounded-2xl border border-white/15 bg-[#100e0a]/80 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md transition-colors hover:border-white/40"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ background: coverGradient(project.slug) }}
      >
        {project.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.cover}
            alt={`${project.title} - ${project.category}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end p-4">
            <span className="text-lg font-semibold text-white/90">{project.title}</span>
          </div>
        )}
        {project.results.length > 0 ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-white/30 bg-black/50 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur">
            {project.results[0].value} {project.results[0].label}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--neon-cyan)]">
          {project.category}
        </p>
        <h3 className="mt-1 text-base font-semibold tracking-tight text-white">
          {project.title}
        </h3>
      </div>
    </Link>
  );
}

/** One challenge/approach/outcome stage card. */
function StageCard({ label, text, index }: { label: string; text: string; index: number }) {
  return (
    <div
      className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-sm"
      style={{ transform: `rotate(${ROTATIONS[index % ROTATIONS.length]}deg)` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--neon-magenta)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{text}</p>
    </div>
  );
}

/**
 * One project's case-study spread: a cover card plus a challenge/approach/
 * outcome stack. When animated, each stage fades in as the pinned scene's own
 * scroll progress moves through this project's [start, end) slice of the run;
 * under reduced motion / narrow viewports everything renders at once.
 */
function ProjectSpread({
  project,
  range,
  reduceOnly,
}: {
  project: Project;
  range: [number, number];
  reduceOnly: boolean;
}) {
  const { progress } = useStage();
  const [start, end] = range;
  const step = (end - start) / STAGE_KEYS.length;

  const challengeOpacity = useTransform(progress, [start, start + step * 0.6], [0, 1]);
  const approachOpacity = useTransform(progress, [start + step, start + step * 1.6], [0, 1]);
  const outcomeOpacity = useTransform(progress, [start + step * 2, start + step * 2.6], [0, 1]);
  const opacities: Record<StageKey, typeof challengeOpacity> = {
    challenge: challengeOpacity,
    approach: approachOpacity,
    outcome: outcomeOpacity,
  };

  if (reduceOnly) {
    return (
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <CoverCard project={project} />
        <div className="grid gap-3 sm:grid-cols-3">
          {STAGE_KEYS.map((key, i) => (
            <StageCard key={key} label={STAGE_LABELS[i]} text={project[key]} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <CoverCard project={project} />
      <div className="grid gap-3 sm:grid-cols-3">
        {STAGE_KEYS.map((key, i) => (
          <motion.div key={key} style={{ opacity: opacities[key] }}>
            <StageCard label={STAGE_LABELS[i]} text={project[key]} index={i} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Work act: the flagship deep-dive. Each real case study (up to three, from
 * /admin) gets its own scroll-revealed challenge/approach/outcome spread,
 * each owning an equal slice of the pinned scene's scroll progress.
 */
export function WorkAct({ projects }: { projects: Project[] }) {
  const { fallback } = useStage();
  const deck = projects.slice(0, 3);
  const slice = 1 / Math.max(deck.length, 1);

  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
          {EYEBROW}
        </span>
        <h2 className="display-serif mt-6 text-balance text-[clamp(2.25rem,4.4vw,4rem)]">
          {HEADLINE}
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{INTRO}</p>
      </div>

      <div className="mt-10 space-y-10">
        {deck.map((p, i) => (
          <ProjectSpread
            key={p.id}
            project={p}
            range={[i * slice, (i + 1) * slice]}
            reduceOnly={fallback}
          />
        ))}
      </div>

      <div className="mt-10">
        <Button href="/work" variant="lightOutline" size="lg" withArrow>
          View all work
        </Button>
      </div>
    </Container>
  );
}
