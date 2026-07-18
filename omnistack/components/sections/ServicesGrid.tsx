import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import type { Service } from "@/lib/types";

export function ServicesGrid({
  services,
  intro,
}: {
  services: Service[];
  intro: string;
}) {
  if (!services.length) return null;
  return (
    <Section id="services">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow="What we do"
          title={<>One team for brand, product, and growth.</>}
          intro={intro}
        />
        <Reveal>
          <Button href="/services" variant="secondary" withArrow>
            Explore all services
          </Button>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => (
          <Reveal key={s.id} delay={(i % 3) * 0.06}>
            <Link
              href={`/services/${s.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hair bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_24px_60px_-30px_rgba(27,22,14,0.14)]"
            >
              <Spotlight />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
                {s.group}
              </span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold">
                Learn more <span aria-hidden>→</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
