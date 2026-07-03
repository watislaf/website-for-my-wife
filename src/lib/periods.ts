import { addDays, daysBetween } from "./dates";

export type WorkDayLite = { id: number; date: string; hours: number; note: string };
export type WorkEntryLite = { id: number; date: string; sourceId: number; amount: number; note: string };
export type MarkerLite = { id: number; endDate: string; name: string };

export type PeriodTotals = {
  hours: number;
  amount: number;
  daysWorked: number;
  perHour: number;
  holidayDays: number | null; // null when the span is unbounded (open period)
  bySource: Record<number, { amount: number }>;
};

export type PeriodSummary = {
  marker: MarkerLite | null;
  startDate: string | null;
  endDate: string | null;
  days: WorkDayLite[];
  entries: WorkEntryLite[];
  totals: PeriodTotals;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** spanStart: for a bounded period this is the day AFTER the previous marker
 *  (exclusive lower bound + 1); for the first-ever period ("" lower) it's the
 *  earliest logged day. `endDate` null → open period → holidayDays null. */
function totals(
  days: WorkDayLite[],
  entries: WorkEntryLite[],
  spanStart: string | null,
  endDate: string | null,
): PeriodTotals {
  let hours = 0;
  const workedDates = new Set<string>();
  for (const d of days) {
    hours += d.hours;
    if (d.hours > 0) workedDates.add(d.date);
  }
  let amount = 0;
  const bySource: Record<number, { amount: number }> = {};
  for (const e of entries) {
    amount += e.amount;
    (bySource[e.sourceId] ??= { amount: 0 }).amount += e.amount;
  }
  const daysWorked = workedDates.size;
  const perHour = hours > 0 ? round2(amount / hours) : 0;

  let holidayDays: number | null = null;
  if (endDate && spanStart && spanStart <= endDate) {
    const spanCalendarDays = daysBetween(spanStart, endDate) + 1; // inclusive
    holidayDays = Math.max(0, spanCalendarDays - daysWorked);
  } else if (endDate) {
    holidayDays = 0; // bounded but no logged start → nothing to count
  }

  hours = round2(hours);
  amount = round2(amount);
  for (const s of Object.values(bySource)) s.amount = round2(s.amount);
  return { hours, amount, daysWorked, perHour, holidayDays, bySource };
}

/** All-time totals; unbounded span → holidayDays null. */
export function lifetimeTotals(days: WorkDayLite[], entries: WorkEntryLite[]): PeriodTotals {
  return totals(days, entries, null, null);
}

export function buildPeriods(
  days: WorkDayLite[],
  entries: WorkEntryLite[],
  markers: MarkerLite[],
): PeriodSummary[] {
  const ms = [...markers].sort((a, b) => a.endDate.localeCompare(b.endDate));
  const ds = [...days].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const es = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const out: PeriodSummary[] = [];
  let lower = ""; // exclusive lower bound; "" < every YYYY-MM-DD

  const firstDate = (dd: WorkDayLite[], ee: WorkEntryLite[]): string | null => {
    const candidates = [dd[0]?.date, ee[0]?.date].filter(Boolean) as string[];
    return candidates.length ? candidates.sort()[0] : null;
  };
  const lastDate = (dd: WorkDayLite[], ee: WorkEntryLite[]): string | null => {
    const candidates = [dd.at(-1)?.date, ee.at(-1)?.date].filter(Boolean) as string[];
    return candidates.length ? candidates.sort().at(-1)! : null;
  };

  for (const marker of ms) {
    const dBucket = ds.filter((d) => d.date > lower && d.date <= marker.endDate);
    const eBucket = es.filter((e) => e.date > lower && e.date <= marker.endDate);
    const spanStart = lower === "" ? firstDate(dBucket, eBucket) : addDays(lower, 1);
    out.push({
      marker,
      startDate: firstDate(dBucket, eBucket),
      endDate: marker.endDate,
      days: dBucket,
      entries: eBucket,
      totals: totals(dBucket, eBucket, spanStart, marker.endDate),
    });
    lower = marker.endDate;
  }

  const openDays = ds.filter((d) => d.date > lower);
  const openEntries = es.filter((e) => e.date > lower);
  out.push({
    marker: null,
    startDate: firstDate(openDays, openEntries),
    endDate: lastDate(openDays, openEntries),
    days: openDays,
    entries: openEntries,
    totals: totals(openDays, openEntries, null, null), // open span unbounded
  });

  return out.reverse(); // newest (open) first
}
