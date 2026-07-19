import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { SiteContent } from "@/lib/types";

/**
 * Closing CTA: not one of the seven painting scenes, so it lives in the
 * non-pinned coda on the same black editorial theme with a lighter fade-in,
 * per the brief's own grouping of Contact alongside Testimonials/Insights/FAQ.
 */
export function ClosingAct({
  cta,
  contact,
}: {
  cta: SiteContent["cta"];
  contact: SiteContent["contact"];
}) {
  return (
    <section className="relative overflow-hidden bg-black py-24 sm:py-32">
      {/* soft neon backlight behind the headline */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[720px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--neon-magenta), transparent 70%)",
        }}
        aria-hidden
      />
      <Container className="relative w-full text-center text-[#f4f1ea]">
        <div className="relative mx-auto max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-magenta)]" aria-hidden />
              Get in touch
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="display-serif mt-7 text-balance text-[clamp(2.75rem,6.5vw,6rem)]">
              {cta.headline}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              {cta.body}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button href={cta.button.href} variant="light" size="lg" withArrow>
                {cta.button.label}
              </Button>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {contact.email}
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 text-sm text-white/50">{cta.reassurance}</p>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
