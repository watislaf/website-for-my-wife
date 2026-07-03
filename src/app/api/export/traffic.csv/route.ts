import { cookies } from "next/headers";
import { asc } from "drizzle-orm";

import { db } from "@/db";
import { landingEvents } from "@/db/schema";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";

/**
 * This route lives under /api and is NOT covered by the proxy matcher
 * (which only guards /admin/:path*), so it authenticates inline.
 */
export const dynamic = "force-dynamic";

/** RFC-4180-ish quoting: wrap in double quotes when the field contains a
 *  comma, double quote, CR or LF, doubling any embedded double quotes. */
function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const events = await db
    .select()
    .from(landingEvents)
    .orderBy(asc(landingEvents.date), asc(landingEvents.id));

  const rows = [
    ["date", "type", "source", "target", "utm_medium", "utm_campaign", "created_at"],
  ];
  for (const e of events) {
    rows.push([
      e.date,
      e.type,
      e.source,
      e.target,
      e.utmMedium ?? "",
      e.utmCampaign ?? "",
      e.createdAt,
    ]);
  }

  const csv = rows.map((r) => r.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="traffic.csv"',
    },
  });
}
