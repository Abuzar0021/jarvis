import Link from "next/link";

export type Crumb = { label: string; href: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: `${SITE_URL}${it.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {items.map((it, i) => {
            const last = i === items.length - 1;
            return (
              <li key={it.href} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden className="text-hair">/</span> : null}
                {last ? (
                  <span className="text-fg" aria-current="page">
                    {it.label}
                  </span>
                ) : (
                  <Link href={it.href} className="transition-colors hover:text-fg">
                    {it.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
