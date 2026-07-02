"use server";

import { db } from "@/db";
import { goals, goalChecks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/admin/goals");
  revalidatePath("/admin");
}

export async function createGoal(data: { title: string; emoji: string }) {
  if (!data.title.trim()) throw new Error("Title required");
  await db.insert(goals).values({
    title: data.title.trim(),
    emoji: data.emoji.trim() || "🎯",
  });
  revalidate();
}

/**
 * Idempotent toggle: check for an existing (goalId, date) row first, then
 * delete it if present or insert it if absent. The `goal_day` unique index
 * (goalId+date) is a second guard against a double insert.
 */
export async function toggleGoalCheck(goalId: number, date: string) {
  const existing = await db
    .select({ id: goalChecks.id })
    .from(goalChecks)
    .where(and(eq(goalChecks.goalId, goalId), eq(goalChecks.date, date)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(goalChecks).where(eq(goalChecks.id, existing[0].id));
  } else {
    await db.insert(goalChecks).values({ goalId, date });
  }
  revalidate();
}

export async function setGoalArchived(id: number, archived: boolean) {
  await db.update(goals).set({ archived }).where(eq(goals.id, id));
  revalidate();
}

export async function deleteGoal(id: number) {
  // goalChecks rows are removed via the ON DELETE CASCADE FK.
  await db.delete(goals).where(eq(goals.id, id));
  revalidate();
}
