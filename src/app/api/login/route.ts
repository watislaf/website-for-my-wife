import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, createSessionToken } from "@/lib/session";

// Per-IP login rate limiter.
//
// State lives in a per-process in-memory Map, so it is per-machine and resets on
// redeploy. This single-machine Fly app (one machine, one volume) makes that the
// right call — no external store needed. With multiple Fly machines each would keep
// its own map (still safe, just N independent counters); we run one, so it's exact.
//
// Policy: up to MAX_FAILURES failed attempts per rolling WINDOW_MS per IP; exceeding
// that locks the IP for LOCK_MS. A successful login clears that IP's entry.

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60_000; // 15 minutes rolling window
const LOCK_MS = 15 * 60_000; // 15 minute lockout once the window is exceeded
const MAX_ENTRIES = 10_000; // hard cap so the map can never grow without bound

type Attempt = { count: number; lockUntil: number; windowStart: number };
const attempts = new Map<string, Attempt>();

function clientIp(req: Request): string {
  // Fly sets Fly-Client-IP to the real client IP; prefer it. X-Forwarded-For can be
  // spoofed/chained, so it is only a fallback (take its first, left-most entry).
  const flyIp = req.headers.get("fly-client-ip");
  if (flyIp) return flyIp.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "unknown";
}

// Opportunistic pruning: drop entries that are no longer locked and whose window has
// fully elapsed. Runs on each request so the map stays bounded by active IPs.
function prune(now: number): void {
  for (const [ip, a] of attempts) {
    if (now >= a.lockUntil && now - a.windowStart >= WINDOW_MS) attempts.delete(ip);
  }
  // Safety net: if pruning didn't get us under the cap (many concurrently-active IPs),
  // evict oldest-window entries until we're back within MAX_ENTRIES.
  if (attempts.size > MAX_ENTRIES) {
    const sorted = [...attempts.entries()].sort(
      (a, b) => a[1].windowStart - b[1].windowStart,
    );
    for (let i = 0; i < sorted.length && attempts.size > MAX_ENTRIES; i++) {
      attempts.delete(sorted[i]![0]);
    }
  }
}

export async function POST(req: Request) {
  const now = Date.now();
  prune(now);

  const ip = clientIp(req);
  const entry = attempts.get(ip);

  // Currently locked out — reject before doing any bcrypt work.
  if (entry && now < entry.lockUntil) {
    return NextResponse.json(
      { error: "Too many attempts, try again in 15 minutes" },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = (body as { password?: string }).password;
  const ok = await bcrypt.compare(password ?? "", process.env.ADMIN_PASSWORD_HASH ?? "");

  if (!ok) {
    // Start a fresh window if there is no entry or the previous window has elapsed.
    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      attempts.set(ip, { count: 1, lockUntil: 0, windowStart: now });
    } else {
      entry.count += 1;
      if (entry.count >= MAX_FAILURES) entry.lockUntil = now + LOCK_MS;
    }
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  // Success: clear this IP's failure state.
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
