import Link from "next/link";
import { Logo } from "./Logo";
import { Container } from "@/components/ui/Container";
import type { Service, SiteContent } from "@/lib/types";
import { whatsappLink } from "@/lib/utils";

export function Footer({
  site,
  services,
}: {
  site: SiteContent;
  services: Service[];
}) {
  const topServices = services.filter((s) => s.featured).slice(0, 6);
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-hair bg-surface">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo brand={site.brand} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {site.footerTagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {site.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="rounded-full border border-hair px-3.5 py-1.5 text-xs text-muted transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Services</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {topServices.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}`} className="text-muted transition-colors hover:text-fg">
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/services" className="text-gold transition-colors hover:underline">
                  All services
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/work" className="text-muted transition-colors hover:text-fg">Work</Link></li>
              <li><Link href="/insights" className="text-muted transition-colors hover:text-fg">Insights</Link></li>
              <li><Link href="/about" className="text-muted transition-colors hover:text-fg">About</Link></li>
              <li><Link href="/#process" className="text-muted transition-colors hover:text-fg">Process</Link></li>
              <li><Link href="/contact" className="text-muted transition-colors hover:text-fg">Contact</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Get in touch</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href={`mailto:${site.contact.email}`} className="text-fg transition-colors hover:text-gold">
                  {site.contact.email}
                </a>
              </li>
              <li>
                <a href={whatsappLink(site.contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-fg">
                  WhatsApp {site.contact.whatsappDisplay}
                </a>
              </li>
              <li className="text-muted">
                {site.contact.locations.map((l) => `${l.city}, ${l.country}`).join("  ·  ")}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-hair pt-8 text-xs text-muted sm:flex-row sm:items-center">
          <p>© {year} {site.brand}. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-fg">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-fg">Terms</Link>
            <a href="#top" className="transition-colors hover:text-fg">Back to top ↑</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
