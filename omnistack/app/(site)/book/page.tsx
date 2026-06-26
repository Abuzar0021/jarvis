import type { Metadata } from "next";
import { getServices, getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/site/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { whatsappLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a free scoping call. Tell us what you're building and get a clear, fixed plan within one business day.",
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const [site, services] = await Promise.all([getSite(), getServices()]);
  const { booking } = site;
  const showCalendar = booking.enabled && booking.calendarUrl;

  return (
    <>
      <PageHeader
        eyebrow="Book a call"
        title={booking.heading || "Book a free scoping call"}
        intro={booking.intro || "Tell us what you're building. You'll get a clear, fixed plan within one business day."}
      />

      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-5">
            <Reveal>
              <div className="space-y-8 rounded-2xl border border-hair bg-card p-7">
                {booking.expectations.length > 0 ? (
                  <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">What to expect</h2>
                    <ol className="mt-4 space-y-4">
                      {booking.expectations.map((e, i) => (
                        <li key={e} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/40 font-mono text-xs text-gold">
                            {i + 1}
                          </span>
                          <span className="text-[15px] text-muted">{e}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <div className="border-t border-hair pt-6">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Prefer to talk now?</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <a
                      href={whatsappLink(site.contact.whatsapp, `Hi ${site.brand}, I'd like to book a call.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-fg transition-colors hover:text-gold"
                    >
                      WhatsApp {site.contact.whatsappDisplay}
                    </a>
                    <a href={`mailto:${site.contact.email}`} className="block text-fg transition-colors hover:text-gold">
                      {site.contact.email}
                    </a>
                  </div>
                  <p className="mt-4 text-sm text-gold">{site.contact.responseTime}</p>
                </div>
              </div>
            </Reveal>
          </aside>

          <div className="lg:col-span-7">
            {showCalendar ? (
              <Reveal>
                <iframe
                  src={booking.calendarUrl}
                  title="Booking calendar"
                  loading="lazy"
                  className="h-[720px] w-full rounded-2xl border border-hair bg-card"
                />
                <p className="mt-4 text-center text-sm text-muted">
                  Trouble with the calendar?{" "}
                  <a href={`mailto:${site.contact.email}`} className="text-gold hover:underline">
                    Email us
                  </a>{" "}
                  and we&rsquo;ll find a time.
                </p>
              </Reveal>
            ) : (
              <Reveal>
                <ContactForm services={services.map((s) => s.name)} source="book" />
              </Reveal>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
