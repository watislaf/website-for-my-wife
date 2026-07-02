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
 * Idempotent, race-safe toggle. Delete-first: attempt to remove the
 * (goalId, date) row and inspect `changes`. If a row was deleted it was
 * present (now unchecked); if nothing was deleted, insert it (now checked).
 * This avoids the select-then-insert window where two rapid calls could both
 * miss the select and the second insert would violate the `goal_day` unique
 * index. The insert is additionally wrapped so a concurrent double-insert
 * (unique-constraint) is swallowed as a no-op rather than throwing.
 */
export async function toggleGoalCheck(goalId: number, date: string) {
  const deleted = await db
    .delete(goalChecks)
    .where(and(eq(goalChecks.goalId, goalId), eq(goalChecks.date, date)));

  if (deleted.changes === 0) {
    try {
      await db.insert(goalChecks).values({ goalId, date });
    } catch (err) {
      // Concurrent insert already created the row (goal_day unique index):
      // the desired state (checked) is satisfied, so treat as a no-op.
      if (!isUniqueConstraintError(err)) throw err;
    }
  }
  revalidate();
}

function isUniqueConstraintError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(msg);
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
