import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import type { Faq } from "@/lib/types";

export function FAQ({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section id="faq" className="border-t border-hair">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow="FAQ" title={<>Questions, answered.</>} />
          <p className="mt-4 text-muted">
            Still curious?{" "}
            <Link href="/contact" className="text-gold hover:underline">
              Talk to us
            </Link>
            .
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="divide-y divide-hair border-y border-hair">
            {faqs.map((f, i) => (
              <Reveal key={f.id} delay={(i % 4) * 0.04}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-medium tracking-tight marker:hidden">
                    {f.question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hair text-muted transition-all duration-300 group-open:rotate-45 group-open:border-gold/50 group-open:text-gold">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{f.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      </Section>
    </>
  );
}
