"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console; a monitoring hook can read this in production.
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-page px-5 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.18em] text-gold">Error</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Something went wrong.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-muted">
        An unexpected error occurred. You can try again, or head back home.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-gold/60 bg-gold-soft px-5 py-2.5 text-sm font-medium text-fg transition-all hover:border-gold hover:bg-gold/15"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-muted transition-colors hover:text-fg">
          Back to home →
        </Link>
      </div>
    </div>
  );
}
