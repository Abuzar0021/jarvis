"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-lg border border-hair bg-card px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/50 transition-colors focus:border-gold/60";

export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Card({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-hair bg-surface p-5 sm:p-6", className)}>
      {title ? (
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-gold">{title}</h2>
      ) : null}
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, mono && "font-mono")}
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "resize-y leading-relaxed")}
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm"
      aria-pressed={checked}
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors",
          checked ? "border-gold/60 bg-gold/30" : "border-hair bg-card",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-fg transition-transform ease-snap",
            checked ? "translate-x-[22px]" : "translate-x-0",
          )}
        />
      </span>
      <span className="font-medium text-fg/90">{label}</span>
    </button>
  );
}

export function StringList({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-lg border border-hair px-3 text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="mt-2 text-sm text-gold hover:underline"
      >
        + Add
      </button>
    </div>
  );
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) onChange(data.url);
      else setErr(data.error || "Upload failed");
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-fg/90">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-16 w-24 rounded-lg border border-hair object-cover" />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-hair text-xs text-muted">
            No image
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload"
            className={inputCls}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-hair px-3 py-1.5 text-xs text-fg/90 transition-colors hover:border-gold/50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange("")} className="text-xs text-muted hover:text-red-400">
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
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
      {err ? <p className="mt-1 text-xs text-red-400">{err}</p> : null}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function SaveBar({
  onSave,
  label = "Save changes",
}: {
  onSave: () => Promise<{ ok: boolean; error?: string }>;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handle() {
    setStatus("saving");
    setMsg("");
    const res = await onSave();
    if (res.ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setStatus("error");
      setMsg(res.error || "Could not save");
    }
  }

  return (
    <div className="sticky bottom-4 z-10 mt-8 flex items-center gap-4 rounded-full border border-hair bg-card/95 px-5 py-3 shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={handle}
        disabled={status === "saving"}
        className="rounded-full border border-gold/60 bg-gold-soft px-5 py-2 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : label}
      </button>
      {status === "saved" ? <span className="text-sm text-gold">Saved & live ✓</span> : null}
      {status === "error" ? <span className="text-sm text-red-400">{msg}</span> : null}
    </div>
  );
}
