"use server";

import { db } from "@/db";
import { planItems } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { todayStr } from "@/lib/dates";

function revalidate() {
  revalidatePath("/admin/planner");
  revalidatePath("/admin");
}

export async function createPlanItem(data: {
  date: string;
  title: string;
  notes: string;
}) {
  if (!data.title.trim()) throw new Error("Title required");
  await db.insert(planItems).values(data);
  revalidate();
}

export async function updatePlanItem(
  id: number,
  data: Partial<{ date: string; title: string; notes: string; done: boolean }>,
) {
  if (data.title !== undefined && !data.title.trim())
    throw new Error("Title required");
  await db.update(planItems).set(data).where(eq(planItems.id, id));
  revalidate();
}

export async function deletePlanItem(id: number) {
  await db.delete(planItems).where(eq(planItems.id, id));
  revalidate();
}

/** Move every past, unfinished item onto today. */
export async function carryOverToToday() {
  const today = todayStr();
  await db
    .update(planItems)
    .set({ date: today })
    .where(and(lt(planItems.date, today), eq(planItems.done, false)));
  revalidate();
}

/** Delete every completed item. Intentionally destructive — guard on the client. */
export async function clearDoneItems() {
  await db.delete(planItems).where(eq(planItems.done, true));
  revalidate();
}
