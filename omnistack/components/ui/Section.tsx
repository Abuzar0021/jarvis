import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { Reveal } from "@/components/motion/Reveal";
import { BlurTextReveal } from "@/components/motion/BlurTextReveal";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-gold">
      <span className="h-px w-6 bg-gold/60" aria-hidden />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      ) : null}
      <BlurTextReveal
        as="h2"
        splitBy="words"
        stagger={0.05}
        className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-[1.05]"
      >
        {title}
      </BlurTextReveal>
      {intro ? (
        <Reveal delay={0.1}>
          <p
            className={cn(
              "mt-4 text-lg leading-relaxed text-muted",
              align === "center" && "mx-auto",
            )}
          >
            {intro}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

export function Section({
  children,
  id,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 py-20 sm:py-28 md:py-32", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
