"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/site/Logo";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error || "Incorrect password.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-9 w-9" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Studio CMS</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage your website.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-hair bg-surface p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg/90">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-hair bg-card px-3.5 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
              placeholder="••••••••"
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-gold/60 bg-gold-soft px-5 py-2.5 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
