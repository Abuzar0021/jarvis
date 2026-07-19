"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { useStage } from "@/components/canvas/StageContext";
import { coverGradient } from "@/lib/utils";
import type { Project } from "@/lib/types";

const EYEBROW = "Selected work";
const HEADLINE = "Work we're proud to put our name on.";
const INTRO = "A few of the products we've designed and shipped end to end.";

// Alternating rotations for the stacked pile.
const ROTATIONS = [-9, 6, -5, 8, -3];
const EASE = [0.16, 1, 0.3, 1] as const;

/** The card face (cover + meta), shared by the deck and the fallback grid. */
function CardFace({ project }: { project: Project }) {
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

/** One deck card: stacked + rotated, dealing out into the row when in view. */
function DeckCard({
  project,
  index,
  count,
}: {
  project: Project;
  index: number;
  count: number;
}) {
  const center = (count - 1) / 2;
  return (
    <motion.div
      initial={{ x: (index - center) * 14, rotate: ROTATIONS[index % ROTATIONS.length] }}
      whileInView={{ x: (index - center) * 248, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.75, delay: 0.2 + index * 0.1, ease: EASE }}
      style={{ zIndex: index }}
      className="absolute left-1/2 top-0 -ml-[120px] w-[240px] will-change-transform"
    >
      <CardFace project={project} />
    </motion.div>
  );
}

/**
 * Work act foreground: the real Work copy in light type over the full-bleed
 * painting, with a project card deck that starts as a stacked, alternately
 * rotated pile and deals out into a side-by-side row when it scrolls into view.
 * Under reduced motion / on mobile it renders a static grid of the same cards.
 */
export function WorkAct({ projects }: { projects: Project[] }) {
  const { fallback } = useStage();
  const deck = projects.slice(0, 4);

  return (
    <Container className="relative w-full text-[#f4f1ea]">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)]" aria-hidden />
          {EYEBROW}
        </span>
        <h2 className="display mt-6 text-balance text-[clamp(2.25rem,4.4vw,4rem)]">
          {HEADLINE}
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">{INTRO}</p>
      </div>

      {fallback ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deck.map((p) => (
            <CardFace key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <div className="relative mx-auto mt-12 h-[290px] w-full">
          {deck.map((p, i) => (
            <DeckCard key={p.id} project={p} index={i} count={deck.length} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <Button href="/work" variant="lightOutline" size="lg" withArrow>
          View all work
        </Button>
      </div>
    </Container>
  );
}
