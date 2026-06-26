import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { SiteContent } from "@/lib/types";

export function CTABand({ site }: { site: SiteContent }) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl border border-hair bg-surface px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full" aria-hidden />
            <div className="grain absolute inset-0 -z-10 rounded-3xl" aria-hidden />
            <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.05]">
              {site.cta.headline}
            </h2>
            {site.cta.body ? (
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted">{site.cta.body}</p>
            ) : null}
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href={site.cta.button.href} variant="primary" size="lg" withArrow>
                {site.cta.button.label}
              </Button>
              <a
                href={`mailto:${site.contact.email}`}
                className="text-sm text-muted transition-colors hover:text-fg"
              >
                or email {site.contact.email}
              </a>
            </div>
            <p className="mt-6 text-sm text-gold">{site.cta.reassurance}</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
