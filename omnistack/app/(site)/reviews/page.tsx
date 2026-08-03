import type { Metadata } from "next";
import Link from "next/link";
import { getApprovedTestimonials } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { ReviewCard } from "@/components/sections/ReviewCard";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Client reviews",
  alternates: { canonical: "/reviews" },
  description:
    "Reviews written by clients, read by a person before publication, and published word for word. How they are collected, checked and moderated, in full.",
};

/**
 * No AggregateRating and no Review structured data on this page, by decision.
 * Google excludes self serving reviews from review rich results, so the markup
 * would earn nothing while inviting a manual action. Stars are not collected
 * or displayed anywhere for the same reason.
 */

/**
 * The EU Omnibus disclosure. Because the business trades from Dublin it has to
 * say whether and how reviews are checked, and this is a designed part of the
 * page rather than a line of grey small print underneath it. Every claim here
 * has to stay true to what the moderation flow actually does.
 */
const LEDGER: { title: string; body: string }[] = [
  {
    title: "Where they come from",
    body: "Only from people we have worked with, submitted through the form on this site. We never buy reviews, never offer anything in exchange for one, and never write one on a client's behalf.",
  },
  {
    title: "How they are checked",
    body: "Each submission arrives with a private email address and the scope of the work, which we match against our own project records. A review is marked verified only when we have written to that address and had a reply, or when the work is one we handed over ourselves. There is no automatic check: a person does this by hand, and anything they cannot confirm is labelled not verified on the card.",
  },
  {
    title: "How they are moderated",
    body: "Nothing publishes itself. Every review waits for manual approval, is published word for word, and is never edited for tone. We decline ones we cannot attribute to a real person and a real project. We do not sort or hide reviews by how favourable they are.",
  },
];

export default async function ReviewsPage() {
  const reviews = await getApprovedTestimonials();
  const featured = reviews.find((t) => t.featured) ?? reviews[0];
  const rest = featured ? reviews.filter((t) => t.id !== featured.id) : [];

  return (
    <>
      <PageHeader
        eyebrow="Client reviews"
        title={
          <>
            What clients said, <span className="serif-accent text-gold">unedited</span>.
          </>
        }
        intro="No star ratings, no widget, no averages. Just what people wrote, who they are, and what we actually built for them."
      />

      <section
        id="verification"
        className="scroll-mt-24 border-b border-hair px-5 py-[clamp(56px,9vh,100px)] sm:px-8 lg:px-16"
      >
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <div className="max-w-[38em]">
              <div className="eyebrow mb-4">Verification</div>
              <h2 className="display-serif m-0 text-[clamp(26px,3.2vw,42px)] text-fg">
                How these reviews get here.
              </h2>
            </div>
          </Reveal>

          <ul className="mt-[clamp(28px,4.5vh,48px)] grid gap-px overflow-hidden rounded-[3px] border border-hair bg-hair lg:grid-cols-3">
            {LEDGER.map((item, i) => (
              <Reveal key={item.title} delay={0.06 + i * 0.06}>
                <li className="flex h-full flex-col gap-2.5 bg-page p-6 sm:p-7">
                  <span
                    className="block h-[9px] w-[9px] rotate-45 border border-gold shadow-[0_0_12px_rgba(198,161,91,.5)]"
                    aria-hidden
                  />
                  <h3 className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg">
                    {item.title}
                  </h3>
                  <p className="m-0 text-pretty text-[13.5px] leading-[1.65] text-fg/85">
                    {item.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {featured ? (
        <Container className="py-[clamp(48px,8vh,90px)]">
          <Reveal>
            <ReviewCard review={featured} variant="featured" />
          </Reveal>

          {rest.length > 0 ? (
            <div className="mt-6 grid gap-px overflow-hidden rounded-[3px] border border-hair bg-hair md:grid-cols-2 xl:grid-cols-3">
              {rest.map((review, i) => (
                // Capped at six steps. Uncapped, the twentieth card would wait
                // over a second and read as a page that failed to load.
                <Reveal key={review.id} delay={Math.min(i, 5) * 0.06}>
                  <div className="review-draw relative h-full">
                    <ReviewCard review={review} />
                  </div>
                </Reveal>
              ))}
            </div>
          ) : null}
        </Container>
      ) : null}

      <section className="border-t border-hair px-5 py-[clamp(56px,9vh,100px)] sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <div className="max-w-[34em]">
              <div className="eyebrow mb-4">Worked with us</div>
              <h2 className="display-serif m-0 text-[clamp(24px,3vw,38px)] text-fg">
                Write one, in your own words.
              </h2>
              <p className="mt-4 text-pretty text-[14px] leading-[1.7] text-muted">
                It takes two minutes, there is nothing to rate out of five, and
                you can ask us to publish it without your name. A person reads
                it before anything goes live.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Magnetic>
              <Link
                href="/reviews/new"
                className="inline-flex items-center gap-3 rounded-full border border-gold/60 bg-gold-soft px-7 py-4 text-[13px] font-medium text-fg transition-colors hover:border-gold hover:bg-gold/15"
              >
                Write a review
                <span aria-hidden className="text-[15px] leading-none">
                  &rarr;
                </span>
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  );
}
