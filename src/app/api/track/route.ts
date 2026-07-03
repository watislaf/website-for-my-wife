import { db } from "@/db";
import { landingEvents } from "@/db/schema";
import { todayStr } from "@/lib/dates";
import { resolveSource } from "@/lib/traffic";

// POST-only route → always dynamic. This is a PUBLIC endpoint (not under the
// /admin proxy): it is called by anonymous landing-page visitors. It must never
// throw to the client — analytics failures must not break the page — so every
// path returns 204.
export const dynamic = "force-dynamic";

// Light in-memory rate limit (per-process, resets on redeploy) — same style as
// the login route. Blunts trivial flooding; not a security control.
const MAX_PER_MINUTE = 600;
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

const noContent = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  if (rateLimited()) return noContent();

  const body = await req.json().catch(() => null);
  const type = (body as { type?: unknown } | null)?.type;
  if (type !== "pageview" && type !== "click") return noContent();

  const rawTarget = (body as { target?: unknown }).target;
  const rawUtm = (body as { utmSource?: unknown }).utmSource;
  const rawUtmMedium = (body as { utmMedium?: unknown }).utmMedium;
  const rawUtmCampaign = (body as { utmCampaign?: unknown }).utmCampaign;
  // Cap stored string lengths so a hostile caller can't POST a multi-MB value
  // (inserted verbatim + would pollute the aggregations).
  const cap = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v.slice(0, 128) : null;
  const utmSource = cap(rawUtm);
  const utmMedium = cap(rawUtmMedium);
  const utmCampaign = cap(rawUtmCampaign);
  const target =
    type === "click" && typeof rawTarget === "string" ? rawTarget.slice(0, 128) : "";

  try {
    const source = resolveSource(utmSource, req.headers.get("referer"));
    await db
      .insert(landingEvents)
      .values({ type, source, target, utmMedium, utmCampaign, date: todayStr() });
  } catch {
    /* analytics must never break the page — swallow and still 204 */
  }

  return noContent();
}
