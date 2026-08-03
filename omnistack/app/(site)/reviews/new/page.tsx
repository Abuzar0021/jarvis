import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { ReviewForm } from "@/components/site/ReviewForm";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Write a review",
  alternates: { canonical: "/reviews/new" },
  description:
    "Worked with us? Write a review in your own words. No star ratings. Nothing is published until a person has read it.",
  robots: { index: false, follow: true },
};

export default function NewReviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Write a review"
        title={
          <>
            Say it in <span className="serif-accent text-gold">your own words</span>.
          </>
        }
        intro="No score out of five, no widget, no template. Tell people what you needed and what actually happened, and we publish it as you wrote it."
      />

      <Container className="py-[clamp(48px,8vh,90px)]">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <ReviewForm />
          </div>

          <aside className="lg:col-span-5">
            <Reveal>
              <div className="space-y-7 rounded-[3px] border border-hair bg-card p-7">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                    Why there are no stars
                  </p>
                  <p className="mt-3 text-[13.5px] leading-[1.7] text-fg/85">
                    A rating a business collects about itself is worth nothing:
                    search engines exclude it, and it tells a reader less than a
                    single honest sentence. So we do not collect one.
                  </p>
                </div>
                <div className="border-t border-hair pt-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                    Your details
                  </p>
                  <p className="mt-3 text-[13.5px] leading-[1.7] text-fg/85">
                    Your email is stored privately and never appears on the
                    site. Your name only appears if you let it. Ask us to remove
                    your review at any point and it goes.
                  </p>
                </div>
                <div className="border-t border-hair pt-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                    Before you write
                  </p>
                  <p className="mt-3 text-[13.5px] leading-[1.7] text-fg/85">
                    Our full collection, verification and moderation policy is
                    on the reviews page, in plain language.
                  </p>
                  <Link
                    href="/reviews#verification"
                    className="group mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold transition-colors hover:text-gold-bright"
                  >
                    Read the policy
                    <span
                      aria-hidden
                      className="transition-transform group-hover:translate-x-1"
                    >
                      &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </Container>
    </>
  );
}
