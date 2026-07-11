import type { Metadata } from "next";
import { getFeaturedProjects, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Thank you",
  description: "Your message has been received.",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage() {
  const [site, projects] = await Promise.all([getSite(), getFeaturedProjects(1)]);
  const featured = projects[0];

  return (
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden">
      <div className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full" aria-hidden />
      <Container className="py-24 text-center">
        <Reveal>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold-soft text-gold">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Thank you - we&rsquo;ve got it.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Your requirements are on their way to our team. {site.contact.responseTime} In the
            meantime, prefer to chat now? Message us on WhatsApp.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {featured ? (
              <Button href={`/work/${featured.slug}`} variant="primary" withArrow>
                Read a case study
              </Button>
            ) : null}
            <Button href="/" variant="secondary">Back to home</Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
