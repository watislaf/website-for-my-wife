import { db } from "@/db";
import { incomeSources, workEntries, workDays, periodMarkers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildPeriods, lifetimeTotals } from "@/lib/periods";
import { todayStr } from "@/lib/dates";
import { WorkBoard } from "@/components/work/WorkBoard";
import { Reveal } from "@/components/motion/Reveal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const sourceRaw = firstParam(sp.source);
  const sourceId = /^\d+$/.test(sourceRaw) ? Number(sourceRaw) : null;
  const from = DATE_RE.test(firstParam(sp.from)) ? firstParam(sp.from) : "";
  const to = DATE_RE.test(firstParam(sp.to)) ? firstParam(sp.to) : "";

  const [sources, allEntries, allDays, markers] = await Promise.all([
    db.select().from(incomeSources).orderBy(asc(incomeSources.id)),
    db.select().from(workEntries).orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(workDays).orderBy(asc(workDays.date), asc(workDays.id)),
    db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
  ]);

  // Lifetime totals over ALL data, independent of filters.
  const lifetime = lifetimeTotals(allDays, allEntries);

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const filteredEntries = allEntries.filter(
    (e) => inRange(e.date) && (sourceId === null || e.sourceId === sourceId),
  );
  // Days: apply the date range always; when a source filter is active, keep only
  // days on which that source earned (so hours/$/h stay meaningful).
  const datesWithSource = sourceId === null ? null : new Set(filteredEntries.map((e) => e.date));
  const filteredDays = allDays.filter(
    (d) => inRange(d.date) && (datesWithSource === null || datesWithSource.has(d.date)),
  );

  const isFiltered = sourceId !== null || Boolean(from) || Boolean(to);
  const periods = buildPeriods(filteredDays, filteredEntries, markers);

  return (
    <div className="flex flex-col gap-6">
      <Reveal onMount>
        <h1 className="text-2xl font-semibold heading-gradient">Work</h1>
      </Reveal>
      <Reveal>
        <WorkBoard
          sources={sources}
          periods={periods}
          today={todayStr()}
          lifetime={lifetime}
          filter={{ source: sourceId, from, to }}
          isFiltered={isFiltered}
        />
      </Reveal>
    </div>
  );
}
