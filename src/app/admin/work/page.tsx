import { db } from "@/db";
import { incomeSources, workEntries, periodMarkers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildPeriods } from "@/lib/periods";
import { todayStr } from "@/lib/dates";
import { WorkBoard } from "@/components/work/WorkBoard";

export default async function WorkPage() {
  const [sources, entries, markers] = await Promise.all([
    db.select().from(incomeSources).orderBy(asc(incomeSources.id)),
    db.select().from(workEntries).orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
  ]);

  const periods = buildPeriods(entries, markers);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold heading-gradient">Work</h1>
      <WorkBoard sources={sources} periods={periods} today={todayStr()} />
    </div>
  );
}
