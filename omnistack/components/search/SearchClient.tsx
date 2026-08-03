"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SearchItem } from "@/lib/search-core";
import { searchIndex } from "@/lib/search-core";

const TYPE_STYLE: Record<string, string> = {
  Work: "border-gold/40 text-gold",
  Service: "border-blue-400/40 text-blue-300",
  Industry: "border-violet-400/40 text-violet-300",
  Insight: "border-green-400/40 text-green-300",
  FAQ: "border-hair text-muted",
};

export function SearchClient({
  index,
  initialQuery,
}: {
  index: SearchItem[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(() => searchIndex(index, query), [index, query]);

  function onChange(value: string) {
    setQuery(value);
    if (typeof window !== "undefined") {
      const url = value ? `/search?q=${encodeURIComponent(value)}` : "/search";
      window.history.replaceState(null, "", url);
    }
  }

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search work, services, industries, insights…"
          aria-label="Search the site"
          className="h-14 w-full rounded-2xl border border-hair bg-card pl-12 pr-4 text-base text-fg placeholder:text-muted/60 focus:border-gold/60"
        />
      </div>

      <p className="mt-4 text-sm text-muted" role="status" aria-live="polite">
        {query.trim()
          ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query.trim()}"`
          : "Start typing to search across the site."}
      </p>

      <ul className="mt-6 space-y-3">
        {results.map((r) => (
          <li key={`${r.type}-${r.href}-${r.title}`}>
            <Link
              href={r.href}
              className="group flex flex-col gap-1 rounded-2xl border border-hair bg-card p-5 transition-colors hover:border-gold/40"
            >
              <span className="flex items-center gap-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wide ${TYPE_STYLE[r.type] ?? "border-hair text-muted"}`}>
                  {r.type}
                </span>
                <span className="font-medium tracking-tight group-hover:text-gold">{r.title}</span>
              </span>
              {r.excerpt ? <span className="line-clamp-2 text-sm text-muted">{r.excerpt}</span> : null}
            </Link>
          </li>
        ))}
      </ul>

      {query.trim() && results.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-hair p-10 text-center text-muted">
          No matches. Try a different term, or{" "}
          <Link href="/contact" className="text-gold hover:underline">
            contact us
          </Link>
          .
        </div>
      ) : null}
    </div>
  );
}
