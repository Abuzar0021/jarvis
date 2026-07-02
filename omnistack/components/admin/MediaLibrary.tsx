"use client";

import { useEffect, useRef, useState } from "react";

type MediaItem = { name: string; url: string; size: number; mtime: number };

function kb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Defer so the initial fetch doesn't call setState synchronously in the effect.
    queueMicrotask(() => {
      void load();
    });
  }, []);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/admin/upload", { method: "POST", body: fd });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(name: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-50"
        >
          {busy ? "Working…" : "Upload image"}
        </button>
        <button type="button" onClick={load} className="text-sm text-muted hover:text-fg">
          Refresh
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hair p-10 text-center text-muted">
          No images yet. Upload one to reuse its URL across the site.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <div key={m.name} className="overflow-hidden rounded-2xl border border-hair bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.name} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-muted" title={m.name}>{m.name}</p>
                <p className="text-[11px] text-muted/70">{kb(m.size)}</p>
                <div className="flex items-center justify-between gap-2">
                  <button type="button" onClick={() => copy(m.url)} className="text-xs text-gold hover:underline">
                    {copied === m.url ? "Copied!" : "Copy URL"}
                  </button>
                  <button type="button" onClick={() => remove(m.name)} className="text-xs text-muted hover:text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
