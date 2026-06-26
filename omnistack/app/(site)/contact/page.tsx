import type { Metadata } from "next";
import { getServices, getSite } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/site/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { whatsappLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  description:
    "Tell us what you're building. We reply within one business day. Based in Dublin and Jakarta.",
};

export default async function ContactPage() {
  const [site, services] = await Promise.all([getSite(), getServices()]);
  const serviceNames = services.map((s) => s.name);

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={<>Tell us what you&rsquo;re building.</>}
        intro={`Send your requirements and we'll come back with a clear, fixed plan. ${site.contact.responseTime}`}
      />

      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <ContactForm services={serviceNames} />
          </div>

          <aside className="lg:col-span-5">
            <Reveal>
              <div className="space-y-8 rounded-2xl border border-hair bg-card p-7">
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Email</h2>
                  <a href={`mailto:${site.contact.email}`} className="mt-2 block text-lg text-fg transition-colors hover:text-gold">
                    {site.contact.email}
                  </a>
                </div>
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">WhatsApp</h2>
                  <a
                    href={whatsappLink(site.contact.whatsapp, `Hi ${site.brand}, I'd like to discuss a project.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-lg text-fg transition-colors hover:text-gold"
                  >
                    {site.contact.whatsappDisplay}
                  </a>
                  <p className="mt-1 text-sm text-muted">Fastest way to reach us.</p>
                </div>
                <div>
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Studios</h2>
                  <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
                    {site.contact.locations.map((l) => (
                      <li key={`${l.city}-${l.country}`}>
                        {l.city}, {l.country}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-hair pt-6">
                  <p className="text-sm text-muted">{site.contact.hours}</p>
                  <p className="mt-1 text-sm text-gold">{site.contact.responseTime}</p>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>
      </Container>
    </>
  );
}
