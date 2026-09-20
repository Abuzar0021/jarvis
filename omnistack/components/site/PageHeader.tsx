import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export function PageHeader({
  eyebrow,
  title,
  intro,
  crumb,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  /**
   * This page's own trail entry, e.g. { label: "About", href: "/about" }.
   * Renders a Home > label breadcrumb and its BreadcrumbList JSON-LD, which the
   * detail routes already emit but the top-level pages did not, so Google had
   * no trail for any of them. Passed rather than derived because `title` is a
   * ReactNode here (several pages pass JSX) and is not usable as a label.
   */
  crumb?: { label: string; href: string };
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-hair">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70" aria-hidden />
      <Container className="pb-[clamp(56px,9vh,90px)] pt-[clamp(120px,16vh,170px)]">
        {crumb ? (
          <div className="mb-7">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, crumb]} />
          </div>
        ) : null}
        {eyebrow ? (
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
          </Reveal>
        ) : null}
        <Reveal delay={0.05}>
          <h1 className="display-serif mt-6 max-w-4xl text-balance text-[clamp(40px,6.4vw,92px)]">
            {title}
          </h1>
        </Reveal>
        {intro ? (
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[34em] text-pretty text-[15px] leading-[1.7] text-muted">
              {intro}
            </p>
          </Reveal>
        ) : null}
        {children ? <div className="mt-9">{children}</div> : null}
      </Container>
    </section>
  );
}
