import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  checkPassword,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 8, 60_000);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !checkPassword(password)) {
    return Response.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(), sessionCookieOptions);
  return Response.json({ ok: true });
}
