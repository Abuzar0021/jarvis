import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { Reveal } from "@/components/motion/Reveal";
import { BlurTextReveal } from "@/components/motion/BlurTextReveal";

/** The design's eyebrow: a short gold rule, then tiny letterspaced caps. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="block h-px w-[26px] bg-gold" aria-hidden />
      <span className="eyebrow">{children}</span>
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
        className="display-serif mt-5 text-balance text-[clamp(30px,4.4vw,58px)]"
      >
        {title}
      </BlurTextReveal>
      {intro ? (
        <Reveal delay={0.1}>
          <p
            className={cn(
              "mt-5 max-w-[34em] text-pretty text-[15px] leading-[1.7] text-muted",
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
