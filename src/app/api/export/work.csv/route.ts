import { cookies } from "next/headers";
import { asc } from "drizzle-orm";

import { db } from "@/db";
import { incomeSources, workEntries } from "@/db/schema";
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

  const [sources, entries] = await Promise.all([
    db.select().from(incomeSources),
    db
      .select()
      .from(workEntries)
      .orderBy(asc(workEntries.date), asc(workEntries.id)),
  ]);

  const nameById = new Map(sources.map((s) => [s.id, s.name]));

  const rows = [["date", "source", "hours", "amount", "$/hour", "note"]];
  for (const e of entries) {
    // Per-row $/hour; blank when hours is 0 (avoid divide-by-zero).
    const perHour =
      e.hours > 0 ? String(Math.round((e.amount / e.hours) * 100) / 100) : "";
    rows.push([
      e.date,
      nameById.get(e.sourceId) ?? "",
      String(e.hours),
      String(e.amount),
      perHour,
      e.note,
    ]);
  }

  const csv = rows.map((r) => r.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="work.csv"',
    },
  });
}
