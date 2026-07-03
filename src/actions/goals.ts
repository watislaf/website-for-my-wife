"use server";

import { db } from "@/db";
import { goals, goalChecks } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/admin/goals");
  revalidatePath("/admin");
}

export async function createGoal(data: { title: string; emoji: string }) {
  if (!data.title.trim()) throw new Error("Title required");
  // Place new goals at the end: one past the current max sortOrder.
  const existing = await db.select({ sortOrder: goals.sortOrder }).from(goals);
  const nextOrder =
    existing.reduce((max, g) => Math.max(max, g.sortOrder), 0) + 1;
  await db.insert(goals).values({
    title: data.title.trim(),
    emoji: data.emoji.trim() || "🎯",
    sortOrder: nextOrder,
  });
  revalidate();
}

export async function updateGoal(
  id: number,
  data: { title: string; emoji: string },
) {
  const title = data.title.trim();
  if (!title) throw new Error("Title required");
  // Only mutate title/emoji — checks (goal_checks rows) are untouched.
  await db
    .update(goals)
    .set({ title, emoji: data.emoji.trim() || "🎯" })
    .where(eq(goals.id, id));
  revalidate();
}

/**
 * Idempotent, race-safe toggle. Delete-first: attempt to remove the
 * (goalId, date) row and inspect `rowsAffected`. If a row was deleted it was
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

  if (deleted.rowsAffected === 0) {
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
  // Prefer the structured error code (driver-provided) over message-text matching.
  const code =
    err && typeof err === "object" && "code" in err
      ? (err as { code?: unknown }).code
      : undefined;
  if (
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    code === "SQLITE_CONSTRAINT_PRIMARYKEY"
  ) {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(msg);
}

export async function setGoalArchived(id: number, archived: boolean) {
  await db.update(goals).set({ archived }).where(eq(goals.id, id));
  revalidate();
}

/**
 * Move an active goal up or down by swapping its sortOrder with the adjacent
 * active goal in the ordered list. No-op at the ends. Wrapped in a transaction
 * so the two rows never share (or lose) an ordering value mid-swap.
 */
export async function reorderGoal(id: number, direction: "up" | "down") {
  const active = await db
    .select({ id: goals.id, sortOrder: goals.sortOrder })
    .from(goals)
    .where(eq(goals.archived, false))
    .orderBy(asc(goals.sortOrder), asc(goals.id));

  const idx = active.findIndex((g) => g.id === id);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= active.length) return; // at an end

  const a = active[idx];
  const b = active[swapIdx];

  // If two goals happen to share a sortOrder (legacy rows all default 0),
  // a raw swap wouldn't change anything. Assign distinct values by index
  // to guarantee the move is observable.
  const aOrder = a.sortOrder === b.sortOrder ? idx : a.sortOrder;
  const bOrder = a.sortOrder === b.sortOrder ? swapIdx : b.sortOrder;

  await db.transaction(async (tx) => {
    await tx.update(goals).set({ sortOrder: bOrder }).where(eq(goals.id, a.id));
    await tx.update(goals).set({ sortOrder: aOrder }).where(eq(goals.id, b.id));
  });
  revalidate();
}

export async function deleteGoal(id: number) {
  // libSQL/Turso does not enforce FK ON DELETE CASCADE by default, so remove the
  // child goalChecks rows explicitly. Wrap both deletes in a transaction so they
  // are atomic (no orphaned goalChecks if the second delete fails).
  await db.transaction(async (tx) => {
    await tx.delete(goalChecks).where(eq(goalChecks.goalId, id));
    await tx.delete(goals).where(eq(goals.id, id));
  });
  revalidate();
}
