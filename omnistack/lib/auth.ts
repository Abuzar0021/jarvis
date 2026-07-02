import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "os_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return (
    process.env.ADMIN_SECRET ||
    process.env.AUTH_SECRET ||
    "omnistack-dev-secret-change-me"
  );
}

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "omnistack-admin";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** Create a signed session token: base64url(payload).signature */
export function signSession(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Constant-time password check. */
export function checkPassword(input: string): boolean {
  const a = Buffer.from(String(input));
  const b = Buffer.from(adminPassword());
  if (a.length !== b.length) {
    // Still run a compare to keep timing roughly constant.
    timingSafeEqual(Buffer.from("0".repeat(b.length || 1)), Buffer.from("0".repeat(b.length || 1)));
    return false;
  }
  return timingSafeEqual(a, b);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

/** Read the request cookies and return whether the admin is authenticated. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
