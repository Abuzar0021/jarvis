"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function BackupTools() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  async function restore(file: File) {
    setStatus("Restoring…");
    try {
      const json = JSON.parse(await file.text());
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("Restored ✓ - content updated.");
        router.refresh();
      } else {
        setStatus(data.error || "Restore failed.");
      }
    } catch {
      setStatus("That doesn't look like a valid backup file.");
    }
  }

  return (
    <div className="rounded-2xl border border-hair bg-surface p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-gold">Backup & restore</h2>
      <p className="mt-2 text-sm text-muted">
        Download a full copy of your content, or restore from a previous backup file.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/admin/backup";
          }}
          className="rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15"
        >
          Download backup
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-hair px-5 py-2 text-sm text-fg transition-colors hover:border-gold/50"
        >
          Restore from file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
            e.target.value = "";
          }}
        />
        {status ? <span className="text-sm text-muted">{status}</span> : null}
      </div>
    </div>
  );
}
