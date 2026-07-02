import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import type { Stat } from "@/lib/types";

export function Stats({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <section className="border-y border-hair bg-surface py-16 sm:py-20">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="text-center md:text-left">
                <div className="font-mono text-4xl font-semibold tracking-tight text-gold sm:text-5xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-sm text-muted">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
