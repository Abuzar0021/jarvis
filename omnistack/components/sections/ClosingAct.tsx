import { Reveal } from "@/components/motion/Reveal";
import { WordReveal } from "@/components/motion/WordReveal";
import { ClosingForm } from "@/components/site/ClosingForm";
import type { SiteContent } from "@/lib/types";

/**
 * The design's closing screen: a full-height gold pool behind a word-by-word
 * headline, with the real contact address as the primary action.
 */
export function ClosingAct({
  cta,
  contact,
}: {
  cta: SiteContent["cta"];
  contact: SiteContent["contact"];
}) {
  return (
    <section
      id="cta"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 py-[clamp(90px,14vh,170px)] text-center sm:px-8 lg:px-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -ml-[600px] -mt-[600px] h-[1200px] w-[1200px]"
        style={{
          background:
            "radial-gradient(circle, rgba(198,161,91,.14) 0%, rgba(198,161,91,.04) 40%, rgba(198,161,91,0) 65%)",
        }}
      />

      <Reveal>
        <div className="eyebrow mb-[clamp(24px,4vh,40px)]">Get in touch</div>
      </Reveal>

      <WordReveal
        as="h2"
        text={cta.headline}
        highlight="own"
        className="display-serif relative m-0 max-w-[18em] text-[clamp(44px,8.4vw,132px)] text-fg"
      />

      <Reveal delay={0.64}>
        <p className="relative m-0 mt-[clamp(26px,4vh,42px)] max-w-[28em] text-pretty text-[clamp(15px,1.3vw,18px)] leading-[1.65] text-muted">
          {cta.body}
        </p>
      </Reveal>

      <Reveal delay={0.72}>
        <ClosingForm email={contact.email} />
      </Reveal>

      <Reveal delay={0.8}>
        <p className="relative mt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
          {cta.reassurance}
        </p>
      </Reveal>
    </section>
  );
}
