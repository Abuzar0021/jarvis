"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CardVideo } from "@/components/sections/CardVideo";
import { coverGradient } from "@/lib/utils";
import type { Project } from "@/lib/types";

/**
 * A template in the gallery grid.
 *
 * The homepage track drives playback from scroll position because its cards
 * move past a fixed centre. A grid has no such centre, so hover and keyboard
 * focus drive it here instead. Either way only the card the visitor is actually
 * looking at decodes anything, and CardVideo's `preload="none"` means an
 * untouched card costs one poster image.
 *
 * The label is not decoration. A gallery of polished pages is precisely where
 * somebody assumes they are looking at delivered client work, and this site has
 * already had fabricated case studies removed once.
 */
export function TemplateCard({ template }: { template: Project }) {
  const hostRef = useRef<HTMLElement>(null);

  const setPlaying = useCallback((on: boolean) => {
    const video = hostRef.current?.querySelector<HTMLElement>("[data-card-video]");
    if (video) video.dataset.playing = on ? "1" : "0";
  }, []);

  const poster = template.videoPoster || template.cover;

  return (
    <article
      ref={hostRef}
      onMouseEnter={() => setPlaying(true)}
      onMouseLeave={() => setPlaying(false)}
      onFocus={() => setPlaying(true)}
      onBlur={() => setPlaying(false)}
      className="group flex h-full flex-col overflow-hidden rounded-[4px] border border-hair bg-card transition-colors ease-snap hover:border-gold/40"
    >
      <Link href={`/templates/${template.slug}`} className="block">
        <div
          className="relative aspect-[16/10] overflow-hidden"
          style={{ background: coverGradient(template.slug) }}
        >
          {template.video ? (
            <CardVideo
              src={template.video}
              poster={poster}
              alt={`${template.title} template preview`}
              className="absolute inset-0"
            />
          ) : poster ? (
            <Image
              src={poster}
              alt={`${template.title} template`}
              fill
              sizes="(max-width: 768px) 100vw, 620px"
              className="object-cover transition-transform duration-500 ease-snap group-hover:scale-[1.03]"
            />
          ) : null}

          <span className="absolute left-4 top-4 rounded-[3px] border border-hair bg-page/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-gold backdrop-blur-sm">
            Template
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 font-serif text-[clamp(20px,2.2vw,28px)] font-normal text-fg">
            <Link href={`/templates/${template.slug}`} className="hover:text-gold">
              {template.title}
            </Link>
          </h2>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            {template.category}
          </span>
        </div>

        <p className="m-0 text-pretty text-sm leading-[1.7] text-muted">
          {template.summary}
        </p>

        {template.tags.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hair px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair pt-4">
          <Link
            href={`/templates/${template.slug}`}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold transition-colors ease-snap hover:text-gold-bright"
          >
            Details
          </Link>
          <a
            href={`/preview/${template.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted transition-colors ease-snap hover:text-fg"
          >
            Open live preview{" "}
            <span aria-hidden className="text-[13px]">
              &#8599;
            </span>
          </a>
        </div>
      </div>
    </article>
  );
}
