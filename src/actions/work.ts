"use server";

import { db } from "@/db";
import { incomeSources, workEntries, workDays, periodMarkers } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { todayStr, addDays } from "@/lib/dates";

function revalidate() {
  revalidatePath("/admin/work");
  revalidatePath("/admin/stats");
  revalidatePath("/admin");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string) {
  if (!DATE_RE.test(date)) throw new Error("Invalid date");
  // Reject absurd future dates (fat-fingered years) that would create a
  // permanent open-period entry. Allow up to one year ahead.
  if (date > addDays(todayStr(), 365)) throw new Error("Date is too far in the future");
}

type IncomeLine = { sourceId: number; amount: number; note?: string };

function assertDayInput(hours: number, lines: IncomeLine[]) {
  if (!Number.isFinite(hours) || hours < 0)
    throw new Error("Hours must be a non-negative number");
  const seen = new Set<number>();
  for (const l of lines) {
    if (!l.sourceId) throw new Error("Each income line needs a source");
    if (seen.has(l.sourceId)) throw new Error("One income line per source per day");
    seen.add(l.sourceId);
    if (!Number.isFinite(l.amount)) throw new Error("Amount must be a finite number");
  }
}

/* ---------- income sources ---------- */

export async function createSource(data: { name: string; color?: string }) {
  if (!data.name.trim()) throw new Error("Name required");
  await db.insert(incomeSources).values({
    name: data.name.trim(),
    color: data.color?.trim() || "#ec4899",
  });
  revalidate();
}

export async function setSourceArchived(id: number, archived: boolean) {
  await db.update(incomeSources).set({ archived }).where(eq(incomeSources.id, id));
  revalidate();
}

export async function updateSource(
  id: number,
  data: Partial<{ name: string; color: string }>,
) {
  const patch: { name?: string; color?: string } = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) throw new Error("Name required");
    patch.name = name;
  }
  if (data.color !== undefined) {
    const color = data.color.trim();
    if (color) patch.color = color;
  }
  if (Object.keys(patch).length === 0) return;
  await db.update(incomeSources).set(patch).where(eq(incomeSources.id, id));
  revalidate();
}

export async function deleteSource(id: number) {
  // Guard: refuse to delete a source that still has work entries, which would
  // orphan them (FK points at income_sources). Archive is the safe alternative.
  const [{ n }] = await db
    .select({ n: count() })
    .from(workEntries)
    .where(eq(workEntries.sourceId, id));
  if (n > 0) throw new Error("Source has entries — archive it instead");
  await db.delete(incomeSources).where(eq(incomeSources.id, id));
  revalidate();
}

/* ---------- work: a day + its income lines ---------- */

/**
 * Upsert one day: its hours/note and the FULL set of income lines for that date.
 * Lines are replaced wholesale (delete any for the date not present, upsert the
 * rest). Clearing everything (0 hours, no lines) deletes the day.
 */
export async function saveDay(data: {
  date: string;
  hours: number;
  note?: string;
  lines: IncomeLine[];
}) {
  assertDate(data.date);
  assertDayInput(data.hours, data.lines);

  if (data.hours === 0 && data.lines.length === 0) {
    await deleteDay(data.date);
    return;
  }

  await db
    .insert(workDays)
    .values({ date: data.date, hours: data.hours, note: data.note?.trim() ?? "" })
    .onConflictDoUpdate({
      target: workDays.date,
      set: { hours: data.hours, note: data.note?.trim() ?? "" },
    });

  // Replace income lines for the date: delete those no longer present, upsert rest.
  const keepIds = data.lines.map((l) => l.sourceId);
  const existing = await db
    .select({ sourceId: workEntries.sourceId })
    .from(workEntries)
    .where(eq(workEntries.date, data.date));
  for (const row of existing) {
    if (!keepIds.includes(row.sourceId)) {
      await db
        .delete(workEntries)
        .where(and(eq(workEntries.date, data.date), eq(workEntries.sourceId, row.sourceId)));
    }
  }
  for (const l of data.lines) {
    await db
      .insert(workEntries)
      .values({ date: data.date, sourceId: l.sourceId, amount: l.amount, note: l.note?.trim() ?? "" })
      .onConflictDoUpdate({
        target: [workEntries.date, workEntries.sourceId],
        set: { amount: l.amount, note: l.note?.trim() ?? "" },
      });
  }
  revalidate();
}

export async function deleteDay(date: string) {
  assertDate(date);
  await db.delete(workEntries).where(eq(workEntries.date, date));
  await db.delete(workDays).where(eq(workDays.date, date));
  revalidate();
}

/** Dashboard quick-add for TODAY: set today's hours and upsert one income line. */
export async function quickAddToday(data: {
  sourceId: number;
  hours: number;
  amount: number;
  note?: string;
}) {
  const date = todayStr();
  assertDayInput(data.hours, [{ sourceId: data.sourceId, amount: data.amount }]);

  await db
    .insert(workDays)
    .values({ date, hours: data.hours, note: "" })
    .onConflictDoUpdate({ target: workDays.date, set: { hours: data.hours } });

  await db
    .insert(workEntries)
    .values({ date, sourceId: data.sourceId, amount: data.amount, note: data.note?.trim() ?? "" })
    .onConflictDoUpdate({
      target: [workEntries.date, workEntries.sourceId],
      set: { amount: data.amount, note: data.note?.trim() ?? "" },
    });
  revalidate();
}

/* ---------- period markers ---------- */

export async function createMarker(data: { endDate: string; name?: string }) {
  assertDate(data.endDate);
  const existing = await db
    .select({ id: periodMarkers.id })
    .from(periodMarkers)
    .where(eq(periodMarkers.endDate, data.endDate))
    .limit(1);
  if (existing.length > 0) throw new Error("A period already ends on this date");
  await db.insert(periodMarkers).values({
    endDate: data.endDate,
    name: data.name?.trim() ?? "",
  });
  revalidate();
}

export async function updateMarker(
  id: number,
  data: Partial<{ endDate: string; name: string }>,
) {
  if (data.endDate !== undefined) {
    assertDate(data.endDate);
    const existing = await db
      .select({ id: periodMarkers.id })
      .from(periodMarkers)
      .where(eq(periodMarkers.endDate, data.endDate))
      .limit(1);
    if (existing.length > 0 && existing[0].id !== id)
      throw new Error("A period already ends on this date");
  }
  const patch = { ...data };
  if (patch.name !== undefined) patch.name = patch.name.trim();
  await db.update(periodMarkers).set(patch).where(eq(periodMarkers.id, id));
  revalidate();
}

export async function deleteMarker(id: number) {
  await db.delete(periodMarkers).where(eq(periodMarkers.id, id));
  revalidate();
}
