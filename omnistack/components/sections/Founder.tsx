import { Reveal } from "@/components/motion/Reveal";
import type { SiteContent } from "@/lib/types";

/**
 * The design's founder block. Its portrait slot is dropped: there is no real
 * photograph of the founder in the repo and inventing one is not an option,
 * so the framed panel carries the heading instead and the column widths shift
 * to a text-led layout.
 */
export function Founder({
  about,
  founder,
  locations,
}: {
  about: SiteContent["about"];
  founder: string;
  locations: SiteContent["contact"]["locations"];
}) {
  // The story is authored as blank-line separated paragraphs.
  const paragraphs = about.story.split(/\n{2,}/).filter(Boolean);

  return (
    <section
      id="about"
      className="relative px-5 py-[clamp(90px,16vh,190px)] sm:px-8 lg:px-16"
    >
      <div className="mx-auto grid max-w-[1100px] items-center gap-[clamp(34px,6vw,84px)] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <Reveal>
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-3.5 rounded-[3px] border border-gold/20"
              aria-hidden
            />
            <blockquote className="relative m-0 p-[clamp(24px,3vw,40px)]">
              <span
                className="mb-6 block h-[11px] w-[11px] rotate-45 border border-gold shadow-[0_0_14px_rgba(198,161,91,.6)]"
                aria-hidden
              />
              <p className="m-0 text-pretty font-serif text-[clamp(23px,2.5vw,34px)] font-light leading-[1.34] text-fg">
                {about.heading}
              </p>
            </blockquote>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <div>
            <div className="eyebrow mb-[22px]">The person doing it</div>
            {paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="m-0 mb-5 max-w-[32em] text-pretty text-sm leading-[1.75] text-muted last:mb-0"
              >
                {p}
              </p>
            ))}
            <div className="mt-8 flex items-center gap-3.5">
              <span className="block h-px w-[34px] bg-gold" aria-hidden />
              <span className="serif-accent text-[19px] text-gold">
                {founder}, Founder
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
                {locations.map((l) => l.city).join(" & ")}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
