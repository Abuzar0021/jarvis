"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AnnouncementBar({
  enabled,
  text,
  linkLabel,
  linkHref,
}: {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
}) {
  const storageKey = `os-ann-dismissed:${text}`.slice(0, 80);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled || !text) return;
    setShow(sessionStorage.getItem(storageKey) !== "1");
  }, [enabled, text, storageKey]);

  if (!enabled || !text || !show) return null;

  return (
    <div className="relative z-50 border-b border-hair bg-base">
      <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-3 px-10 py-2.5 text-center text-xs sm:text-[13px]">
        <p className="text-muted">
          {text}{" "}
          {linkLabel && linkHref ? (
            <Link href={linkHref} className="font-medium text-fg underline decoration-gold decoration-2 underline-offset-4 hover:text-gold">
              {linkLabel}
            </Link>
          ) : null}
        </p>
        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            sessionStorage.setItem(storageKey, "1");
            setShow(false);
          }}
          className="absolute right-4 flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
