"use server";

import { db } from "@/db";
import { planItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  await db.update(planItems).set(data).where(eq(planItems.id, id));
  revalidate();
}

export async function deletePlanItem(id: number) {
  await db.delete(planItems).where(eq(planItems.id, id));
  revalidate();
}
