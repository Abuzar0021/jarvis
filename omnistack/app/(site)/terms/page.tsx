import type { Metadata } from "next";
import { getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you work with OmniStack Digital.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const site = await getSite();
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of Service" intro="The basics of working with us." />
      <Section>
        <div className="max-w-2xl space-y-5 text-[15px] leading-relaxed text-muted">
          <p>
            These terms govern your use of the {site.brand} website. By using this site you agree to
            them. Specific project work is governed by a separate written agreement.
          </p>
          <h2 className="text-lg font-semibold text-fg">Use of this site</h2>
          <p>
            The content on this site is provided for general information. We work hard to keep it
            accurate, but we make no warranties about completeness or fitness for a particular
            purpose.
          </p>
          <h2 className="text-lg font-semibold text-fg">Intellectual property</h2>
          <p>
            All branding, copy, and design on this site belong to {site.brand} unless otherwise
            stated. Project work is owned per the terms of your engagement contract.
          </p>
          <h2 className="text-lg font-semibold text-fg">Enquiries & quotes</h2>
          <p>
            Submitting a form is not a binding agreement. Scope, timeline, and price are confirmed in
            a written proposal before any work begins.
          </p>
          <h2 className="text-lg font-semibold text-fg">Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${site.contact.email}`} className="text-gold hover:underline">
              {site.contact.email}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
