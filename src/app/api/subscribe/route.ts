import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isValidEmail, normalizeEmail } from "@/lib/email";

// POST-only route → always dynamic. This is a PUBLIC endpoint (not under the
// /admin proxy): it is called by anonymous landing-page visitors submitting the
// newsletter form. It must never throw to the client — a DB hiccup must not
// crash the page — so unexpected failures return a friendly 500 JSON, never an
// unhandled exception.
export const dynamic = "force-dynamic";

// Light in-memory rate limit (per-process, resets on redeploy) — same style as
// the track route. Blunts trivial flooding; not a security control.
const MAX_PER_MINUTE = 120;
let windowStart = 0;
let countInWindow = 0;

function rateLimited(): boolean {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    countInWindow = 0;
  }
  countInWindow += 1;
  return countInWindow > MAX_PER_MINUTE;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (rateLimited()) {
    return json({ error: "Too many requests, try again shortly." }, 429);
  }

  const body = await req.json().catch(() => null);
  const rawEmail = (body as { email?: unknown } | null)?.email;

  if (!isValidEmail(rawEmail)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const email = normalizeEmail(rawEmail);

  try {
    // If the email already exists the unique constraint trips — treat as SUCCESS
    // and do NOT reveal that it was already subscribed (avoids leaking whether a
    // given address is on the list). onConflictDoNothing makes the insert a
    // silent no-op instead of throwing.
    await db.insert(subscribers).values({ email }).onConflictDoNothing();
  } catch {
    // Any unexpected DB failure → friendly error, never an unhandled crash.
    return json({ error: "Something went wrong. Please try again." }, 500);
  }

  return json({ ok: true });
}
