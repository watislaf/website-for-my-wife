import { db } from "@/db";
import { planItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import { todayStr } from "@/lib/dates";
import { PlannerBoard } from "@/components/planner/PlannerBoard";

export default async function PlannerPage() {
  const items = await db
    .select()
    .from(planItems)
    .orderBy(asc(planItems.date), asc(planItems.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold heading-gradient">Planner</h1>
      <PlannerBoard items={items} today={todayStr()} />
    </div>
  );
}
