import type { Metadata } from "next";
import { getFaqs } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { MaskLine } from "@/components/motion/MaskLine";
import { WordReveal } from "@/components/motion/WordReveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { FAQ } from "@/components/sections/FAQ";
import { cn } from "@/lib/utils";
import {
  PricingCalculator,
  RetainerTiers,
} from "@/components/sections/PricingCalculator";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
  description:
    "Scope your build and get a real price range in ten seconds. One time cost, you own the code, and growth work stays optional.",
};

/** Italic gold accent inside a headline, matching the design's `h2 em`. */
function Accent({ children }: { children: React.ReactNode }) {
  return <em className="serif-accent text-gold">{children}</em>;
}

/** The design's `.sec-head`: eyebrow, masked two line headline, lede. */
function SectionHead({
  eyebrow,
  lines,
  lede,
}: {
  eyebrow: string;
  lines: React.ReactNode[];
  lede?: string;
}) {
  return (
    <div className="mb-[clamp(44px,6vw,72px)] max-w-3xl">
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <h2 className="display-serif mt-4 text-balance text-[clamp(32px,4.4vw,54px)]">
        {lines.map((line, i) => (
          <MaskLine key={i} delay={i * 0.09}>
            {line}
          </MaskLine>
        ))}
      </h2>
      {lede ? (
        <Reveal delay={0.12}>
          <p className="mt-5 max-w-[34em] text-pretty text-[15.5px] leading-[1.65] text-muted">
            {lede}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Section 1: the rent versus own framing, stated without competitor pricing. */
const OWNERSHIP = [
  {
    label: "Rented",
    body: "A subscription buys access, not the thing itself. It renews monthly, forever, and it climbs as you add features.",
  },
  {
    label: "Owned",
    body: "One build, paid once. After that the only running cost is hosting, a few dollars a month, billed to you by your provider.",
  },
  {
    label: "Either way",
    body: "The repository, the content, and the hosting account are handed to you on launch day. Nothing is held back.",
  },
];

/**
 * Section 4. The competitor columns describe how those models work rather than
 * quoting anyone's prices: published rates move constantly and vary by plan,
 * region, and add-ons, so a hardcoded figure here would be wrong within months.
 */
const COMPARISON: { row: string; platform: string; agency: string; own: string }[] = [
  {
    row: "Ongoing cost",
    platform: "Monthly, forever, and it rises with add-ons",
    agency: "Monthly retainer on top of the build",
    own: "Hosting only, a few dollars a month",
  },
  {
    row: "Who owns the code",
    platform: "The platform. It cannot leave with you.",
    agency: "Varies, often licensed rather than transferred",
    own: "You do. Full repository, handed over.",
  },
  {
    row: "If you stop paying",
    platform: "The site goes offline",
    agency: "Support stops, the site may too",
    own: "It keeps running. It is yours.",
  },
  {
    row: "Speed",
    platform: "Shared infrastructure, template overhead",
    agency: "Depends on the stack chosen",
    own: "Next.js on dedicated infrastructure",
  },
  {
    row: "Design ceiling",
    platform: "Template constraints you will hit fast",
    agency: "Custom, at retainer cost",
    own: "Fully custom, no template floor",
  },
  {
    row: "Who you talk to",
    platform: "A support ticket queue",
    agency: "An account manager, then a handoff",
    own: "The person building it. Directly.",
  },
];

/** Section 6. */
const GOOD_FIT = [
  "You are paying a platform every month and it is starting to grate",
  "Your site is slow, and you suspect it is costing you",
  "You want the thing you paid for to actually belong to you",
  "You would rather talk to the person building it than an account manager",
  "You are planning to keep this site for years, not months",
];

const WRONG_FIT = [
  "You need it live in under a week",
  "You want to restructure layouts yourself, daily, without a developer",
  "You are looking for the cheapest possible option",
  "You need a large team on call around the clock",
  "You are not sure the business is sticking around yet. Use a platform first.",
];

export default async function PricingPage() {
  const faqs = await getFaqs();

  return (
    <>
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden border-b border-hair">
        <div
          className="gold-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-70"
          aria-hidden
        />
        <Container className="pb-[clamp(56px,9vh,90px)] pt-[clamp(120px,16vh,170px)]">
          <Reveal>
            <Eyebrow>Rent vs. Own</Eyebrow>
          </Reveal>
          <h1 className="display-serif mt-6 max-w-4xl text-balance text-[clamp(38px,6.2vw,88px)]">
            <MaskLine>Every month you don&apos;t own it,</MaskLine>
            <MaskLine delay={0.09}>
              <Accent>you&apos;re paying for it again.</Accent>
            </MaskLine>
          </h1>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-[34em] text-pretty text-[15.5px] leading-[1.7] text-muted">
              A platform fee keeps your own site switched on. A build you own is paid
              once and then it simply runs. Here is what that costs, in the open, with
              no email gate in front of it.
            </p>
          </Reveal>

          <div className="mt-11 grid gap-px border-y border-hair-soft bg-hair-soft sm:grid-cols-3">
            {OWNERSHIP.map((item, i) => (
              <Reveal key={item.label} delay={0.14 + i * 0.08}>
                <div className="h-full bg-page px-6 py-7">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gold">
                    {item.label}
                  </p>
                  <p className="mt-3 text-[13.5px] leading-[1.6] text-muted">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Magnetic>
                <Button href="#calculator" size="lg" withArrow>
                  Price my build
                </Button>
              </Magnetic>
              <Button href="#retainer" variant="secondary" size="lg">
                See growth retainers
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 2. Calculator */}
      <Section id="calculator">
        <SectionHead
          eyebrow="Scope Your Build"
          lines={[
            "Tell us what you need.",
            <>
              Get a <Accent>real range</Accent> in ten seconds.
            </>,
          ]}
          lede="No email gate, no waiting on a proposal. Pick what fits, see where your project lands."
        />
        <PricingCalculator />
      </Section>

      {/* 3. Retainer */}
      <Section id="retainer" className="border-t border-hair-soft">
        <SectionHead
          eyebrow="Optional, After Launch"
          lines={[
            "The site is yours either way.",
            <>
              <Accent>Growth is the part you can hire.</Accent>
            </>,
          ]}
        />
        <Reveal>
          <div className="mb-[clamp(40px,5vw,60px)] max-w-[620px] border-l-2 border-gold bg-card-2 px-7 py-6">
            <p className="text-[14px] leading-[1.65] text-fg">
              To be clear about what this is: you never pay a fee to keep your site{" "}
              <b className="font-medium text-gold">online</b>. That is the whole point of
              owning it. Search work is a{" "}
              <b className="font-medium text-gold">service you hire</b>, month to month,
              cancel whenever. Stop, and your site keeps running, and every ranking and
              page gained stays yours.
            </p>
          </div>
        </Reveal>
        <RetainerTiers />
      </Section>

      {/* 4. Comparison */}
      <Section className="border-t border-hair-soft">
        <SectionHead
          eyebrow="The Difference"
          lines={[
            "What you get when the",
            <>
              site is <Accent>actually yours.</Accent>
            </>,
          ]}
        />
        <Reveal>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr>
                  <th scope="col" className="border-b border-hair px-6 py-5" />
                  <th
                    scope="col"
                    className="border-b border-hair px-6 py-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Wix / Squarespace
                  </th>
                  <th
                    scope="col"
                    className="border-b border-hair px-6 py-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Typical agency retainer
                  </th>
                  <th
                    scope="col"
                    className="border-x border-b border-x-hair border-b-gold px-6 py-5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold"
                  >
                    OmniStack
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.row} className="border-b border-hair-soft">
                    <th
                      scope="row"
                      className="w-[26%] px-6 py-5 align-top text-[14px] font-medium text-fg"
                    >
                      {r.row}
                    </th>
                    <td className="px-6 py-5 align-top text-[14px] leading-[1.55] text-muted">
                      {r.platform}
                    </td>
                    <td className="px-6 py-5 align-top text-[14px] leading-[1.55] text-muted">
                      {r.agency}
                    </td>
                    <td className="border-x border-hair bg-gold-soft px-6 py-5 align-top text-[14px] leading-[1.55] text-fg">
                      <span aria-hidden className="mr-2 text-gold">
                        &#10022;
                      </span>
                      {r.own}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-7 max-w-[640px] text-[11.5px] leading-[1.6] text-muted">
            The platform and agency columns describe how those models generally work,
            not any one provider&apos;s current plan. Terms, limits, and pricing vary by
            provider, plan, region, and add-ons, and they change often. Your own quote is
            confirmed on a scoping call before any work begins.
          </p>
        </Reveal>
      </Section>

      {/* 5. Guarantee */}
      <Section className="border-t border-hair-soft">
        <div className="mx-auto max-w-[900px] text-center">
          <Reveal>
            <Eyebrow>The Risk Is Mine</Eyebrow>
          </Reveal>
          <WordReveal
            as="h2"
            text="See the first direction before you commit."
            highlight="commit."
            className="display-serif mt-5 text-[clamp(34px,5.2vw,68px)]"
          />
          <Reveal delay={0.16}>
            <p className="mx-auto mt-7 max-w-[560px] text-pretty text-[16px] leading-[1.7] text-muted">
              You will get a real design direction for your homepage before any invoice
              is due. If it is not right, say so: you walk away owing nothing, and you
              keep the concept. Every build after that runs on a fixed price agreed up
              front. No hourly surprises, no scope drift.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mt-10 inline-flex items-center gap-3 rounded-[2px] border border-hair px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">
              <span aria-hidden>&#10022;</span>
              No deposit until you have seen the work
            </p>
          </Reveal>
        </div>
      </Section>

      {/* 6. Disqualifier */}
      <Section className="border-t border-hair-soft">
        <SectionHead
          eyebrow="An Honest Filter"
          lines={[
            "This isn't right",
            <>
              for <Accent>everyone.</Accent>
            </>,
          ]}
          lede="Both of us lose if the fit is wrong. Here is the line, before you book a call."
        />
        <div className="grid gap-px border border-hair-soft bg-hair-soft lg:grid-cols-2">
          {[
            {
              head: "Good fit",
              sub: "You will get real value here.",
              items: GOOD_FIT,
              yes: true,
            },
            {
              head: "Wrong fit",
              sub: "You would be better served elsewhere.",
              items: WRONG_FIT,
              yes: false,
            },
          ].map((col, i) => (
            <Reveal key={col.head} delay={i * 0.1} className="h-full">
              <div className={cn("h-full px-8 py-10", col.yes ? "bg-card" : "bg-page")}>
                <h3
                  className={cn(
                    "font-serif text-[24px] font-normal",
                    col.yes ? "text-gold" : "text-muted",
                  )}
                >
                  {col.head}
                </h3>
                <p className="mt-2 mb-6 text-[12.5px] text-muted">{col.sub}</p>
                <ul>
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        "relative border-b border-hair-soft py-3 pl-6 text-[14px] leading-[1.6] last:border-b-0",
                        col.yes ? "text-fg" : "text-muted",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-[15px] text-[10px]",
                          col.yes ? "text-gold" : "text-muted",
                        )}
                      >
                        {col.yes ? "\u2726" : "\u00B7"}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 7. FAQ */}
      <FAQ faqs={faqs} />
    </>
  );
}
