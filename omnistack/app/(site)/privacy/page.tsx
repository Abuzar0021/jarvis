import type { Metadata } from "next";
import { getSite } from "@/lib/content";
import { PageHeader } from "@/components/site/PageHeader";
import { Section } from "@/components/ui/Section";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const site = await getSite();
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy Policy" intro="How we handle your data." />
      <Section>
        <div className="prose-invert max-w-2xl space-y-5 text-[15px] leading-relaxed text-muted">
          <p>
            {site.brand} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy. This policy explains what we
            collect when you use our website and contact us.
          </p>
          <h2 className="text-lg font-semibold text-fg">What we collect</h2>
          <p>
            When you submit our contact or newsletter forms, we collect the details you provide
            (such as your name, email, company, and message) so we can respond to your enquiry.
            We also store a hashed reference of your request for security and spam prevention.
          </p>
          <h2 className="text-lg font-semibold text-fg">How we use it</h2>
          <p>
            We use your information solely to respond to you, deliver the services you request, and
            improve our website. We do not sell your data. We do not send marketing email unless you
            opt in via our newsletter.
          </p>
          <h2 className="text-lg font-semibold text-fg">Your rights</h2>
          <p>
            You can request access to, correction of, or deletion of your personal data at any time
            by emailing{" "}
            <a href={`mailto:${site.contact.email}`} className="text-gold hover:underline">
              {site.contact.email}
            </a>
            . We respond within one business day.
          </p>
          <h2 className="text-lg font-semibold text-fg">Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
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
