"use server";

import { db } from "@/db";
import { incomeSources, workEntries, periodMarkers } from "@/db/schema";
import { eq, count } from "drizzle-orm";
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

function assertEntry(data: { hours: number; amount: number; date: string; sourceId: number }) {
  assertDate(data.date);
  if (!Number.isFinite(data.hours) || data.hours < 0)
    throw new Error("Hours must be a non-negative number");
  if (!Number.isFinite(data.amount)) throw new Error("Amount must be a finite number");
  if (!data.sourceId) throw new Error("Source required");
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

/* ---------- work entries ---------- */

export async function createEntry(data: {
  date: string;
  sourceId: number;
  hours: number;
  amount: number;
  note: string;
}) {
  assertEntry(data);
  await db.insert(workEntries).values({
    date: data.date,
    sourceId: data.sourceId,
    hours: data.hours,
    amount: data.amount,
    note: data.note.trim(),
  });
  revalidate();
}

export async function updateEntry(
  id: number,
  data: Partial<{
    date: string;
    sourceId: number;
    hours: number;
    amount: number;
    note: string;
  }>,
) {
  if (data.date !== undefined) assertDate(data.date);
  if (data.hours !== undefined && (!Number.isFinite(data.hours) || data.hours < 0))
    throw new Error("Hours must be a non-negative number");
  if (data.amount !== undefined && !Number.isFinite(data.amount))
    throw new Error("Amount must be a finite number");
  if (data.sourceId !== undefined && !data.sourceId) throw new Error("Source required");
  const patch = { ...data };
  if (patch.note !== undefined) patch.note = patch.note.trim();
  await db.update(workEntries).set(patch).where(eq(workEntries.id, id));
  revalidate();
}

export async function deleteEntry(id: number) {
  await db.delete(workEntries).where(eq(workEntries.id, id));
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
