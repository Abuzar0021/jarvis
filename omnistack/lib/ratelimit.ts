// Lightweight in-memory rate limiter (per process). Good enough for a single
// Node instance; swap for Redis if you scale horizontally.

type Hit = { count: number; reset: number };
const store = new Map<string, Hit>();

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || now > hit.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    if (store.size > 5000) {
      for (const [k, v] of store) if (now > v.reset) store.delete(k);
    }
    return { ok: true, remaining: limit - 1 };
  }

  hit.count += 1;
  if (hit.count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - hit.count };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
