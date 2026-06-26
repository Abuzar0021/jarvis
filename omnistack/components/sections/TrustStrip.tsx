import { Container } from "@/components/ui/Container";
import { Marquee } from "@/components/motion/Marquee";

export function TrustStrip({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <section className="border-y border-hair bg-surface/40 py-10">
      <Container>
        <p className="mb-6 text-center text-sm text-muted">{label}</p>
      </Container>
      <Marquee>
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="whitespace-nowrap font-mono text-sm uppercase tracking-[0.14em] text-muted/70"
          >
            {item}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
