export type WorkEntryLite = { id: number; date: string; sourceId: number; hours: number; amount: number; note: string };
export type MarkerLite = { id: number; endDate: string; name: string };
export type PeriodTotals = {
  hours: number; amount: number; daysWorked: number; perHour: number;
  bySource: Record<number, { hours: number; amount: number }>;
};
export type PeriodSummary = {
  marker: MarkerLite | null;
  startDate: string | null;
  endDate: string | null;
  entries: WorkEntryLite[];
  totals: PeriodTotals;
};

function totals(entries: WorkEntryLite[]): PeriodTotals {
  const t: PeriodTotals = { hours: 0, amount: 0, daysWorked: 0, perHour: 0, bySource: {} };
  const days = new Set<string>();
  for (const e of entries) {
    t.hours += e.hours;
    t.amount += e.amount;
    days.add(e.date);
    const s = (t.bySource[e.sourceId] ??= { hours: 0, amount: 0 });
    s.hours += e.hours;
    s.amount += e.amount;
  }
  t.daysWorked = days.size;
  t.perHour = t.hours > 0 ? Math.round((t.amount / t.hours) * 100) / 100 : 0;
  return t;
}

export function buildPeriods(entries: WorkEntryLite[], markers: MarkerLite[]): PeriodSummary[] {
  const ms = [...markers].sort((a, b) => a.endDate.localeCompare(b.endDate));
  const es = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const out: PeriodSummary[] = [];
  let lower = ""; // exclusive lower bound; "" < every YYYY-MM-DD
  for (const marker of ms) {
    const bucket = es.filter((e) => e.date > lower && e.date <= marker.endDate);
    out.push({
      marker,
      startDate: bucket[0]?.date ?? null,
      endDate: marker.endDate,
      entries: bucket,
      totals: totals(bucket),
    });
    lower = marker.endDate;
  }
  const openBucket = es.filter((e) => e.date > lower);
  out.push({
    marker: null,
    startDate: openBucket[0]?.date ?? null,
    endDate: openBucket.at(-1)?.date ?? null,
    entries: openBucket,
    totals: totals(openBucket),
  });
  return out.reverse(); // newest (open) first
}
