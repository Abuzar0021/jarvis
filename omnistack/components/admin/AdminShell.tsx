"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Site content", href: "/admin/content" },
  { label: "Projects", href: "/admin/projects" },
  { label: "Services", href: "/admin/services" },
  { label: "Testimonials", href: "/admin/testimonials" },
  { label: "Insights", href: "/admin/insights" },
  { label: "FAQs", href: "/admin/faqs" },
  { label: "Leads", href: "/admin/leads" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-base lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-hair bg-surface lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">Studio CMS</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-gold-soft text-gold"
                    : "text-muted hover:bg-white/5 hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden gap-2 p-3 lg:flex lg:flex-col">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3.5 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            View site ↗
          </a>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg px-3.5 py-2.5 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
