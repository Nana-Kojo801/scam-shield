// In-memory fixed-window limiter. On serverless each instance keeps its own map,
// so this is a speed bump against casual abuse, not a hard guarantee.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW
    ? { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
    : { ok: true, retryAfter: 0 };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function resetRateLimit() {
  hits.clear();
}
