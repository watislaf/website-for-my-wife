import { cookies } from "next/headers";
import { asc } from "drizzle-orm";

import { db } from "@/db";
import { incomeSources, workEntries, workDays } from "@/db/schema";
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

  const [sources, entries, days] = await Promise.all([
    db.select().from(incomeSources),
    db.select().from(workEntries).orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(workDays).orderBy(asc(workDays.date)),
  ]);

  const nameById = new Map(sources.map((s) => [s.id, s.name]));
  const hoursByDate = new Map(days.map((d) => [d.date, d.hours]));
  const entryDates = new Set(entries.map((e) => e.date));

  // One row per income line (with that day's hours), PLUS a row for any day that
  // has hours but no income line so hours-only days still export.
  const header = ["date", "hours", "source", "amount", "note"];
  const body: string[][] = [];
  for (const e of entries) {
    body.push([
      e.date,
      String(hoursByDate.get(e.date) ?? 0),
      nameById.get(e.sourceId) ?? "",
      String(e.amount),
      e.note,
    ]);
  }
  for (const d of days) {
    if (!entryDates.has(d.date)) {
      body.push([d.date, String(d.hours), "", "", d.note]);
    }
  }
  body.sort((a, b) => a[0].localeCompare(b[0]));

  const csv = [header, ...body].map((r) => r.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="work.csv"',
    },
  });
}
