import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/fields";
import {
  getFaqs,
  getLeads,
  getProjects,
  getServices,
  getTestimonials,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [projects, services, testimonials, faqs, leads] = await Promise.all([
    getProjects(),
    getServices(),
    getTestimonials(),
    getFaqs(),
    getLeads(),
  ]);

  const newLeads = leads.filter((l) => l.status === "new").length;

  const cards = [
    { label: "Projects", value: projects.length, href: "/admin/projects" },
    { label: "Services", value: services.length, href: "/admin/services" },
    { label: "Testimonials", value: testimonials.length, href: "/admin/testimonials" },
    { label: "FAQs", value: faqs.length, href: "/admin/faqs" },
    { label: "New enquiries", value: newLeads, href: "/admin/leads" },
  ];

  return (
    <AdminShell>
      <PageTitle title="Dashboard" description="Manage every part of your website — no code required." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-hair bg-surface p-5 transition-colors hover:border-gold/40"
          >
            <p className="font-mono text-3xl font-semibold text-gold">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/projects" className="rounded-2xl border border-hair bg-surface p-6 transition-colors hover:border-gold/40">
          <h2 className="font-semibold">Add or edit projects</h2>
          <p className="mt-1 text-sm text-muted">Add new work, upload covers, write case studies, reorder, or remove.</p>
          <span className="mt-3 inline-block text-sm text-gold">Open Projects →</span>
        </Link>
        <Link href="/admin/content" className="rounded-2xl border border-hair bg-surface p-6 transition-colors hover:border-gold/40">
          <h2 className="font-semibold">Edit site content</h2>
          <p className="mt-1 text-sm text-muted">Hero, about, contact details, WhatsApp, announcement, stats, and more.</p>
          <span className="mt-3 inline-block text-sm text-gold">Open Site content →</span>
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-hair bg-surface p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Good to know</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>• Every change you save here goes live on your website immediately.</li>
          <li>• Set <code className="text-fg/90">ADMIN_PASSWORD</code> in your environment to secure this dashboard.</li>
          <li>• Add SMTP settings to receive contact-form enquiries by email — they always appear under Leads regardless.</li>
        </ul>
      </div>
    </AdminShell>
  );
}
