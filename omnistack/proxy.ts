import { NextResponse } from "next/server";

// Allow an optional self-hosted Umami origin in the CSP when configured.
function umamiOrigin(): string {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC;
  if (!src) return "";
  try {
    return new URL(src).origin;
  } catch {
    return "";
  }
}

export function proxy() {
  const res = NextResponse.next();
  const umami = umamiOrigin();

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${umami ? " " + umami : ""}`,
    `connect-src 'self'${umami ? " " + umami : ""}`,
    "frame-src 'self' https:",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
