import { asc } from "drizzle-orm";
import { DownloadIcon } from "lucide-react";

import { db } from "@/db";
import {
  incomeSources,
  workEntries,
  periodMarkers,
  goals as goalsTable,
  goalChecks,
} from "@/db/schema";
import { buildPeriods } from "@/lib/periods";
import { currentStreak, bestStreak } from "@/lib/streaks";
import { todayStr, addDays } from "@/lib/dates";
import { fmtMoney, fmtHours } from "@/components/work/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Charts,
  type MonthPoint,
  type CumulativeRow,
  type SourceMeta,
} from "@/components/stats/Charts";
import { Heatmap } from "@/components/stats/Heatmap";
import { FilterBar } from "@/components/stats/FilterBar";
import { SourceTable, type SourceRow } from "@/components/stats/SourceTable";
import { GoalsStats, type GoalStat } from "@/components/stats/GoalsStats";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Add one calendar month to a YYYY-MM string. */
function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  let from = DATE_RE.test(firstParam(sp.from)) ? firstParam(sp.from) : "";
  let to = DATE_RE.test(firstParam(sp.to)) ? firstParam(sp.to) : "";
  // Guard against an inverted range (from after to): swap so the filter is sane.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }
  const isFiltered = Boolean(from) || Boolean(to);

  const [sources, allEntries, markers, allGoals, allChecks] = await Promise.all([
    db.select().from(incomeSources).orderBy(asc(incomeSources.id)),
    db
      .select()
      .from(workEntries)
      .orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
    db.select().from(goalsTable).orderBy(asc(goalsTable.sortOrder), asc(goalsTable.id)),
    db.select().from(goalChecks),
  ]);

  const today = todayStr();

  // Entries scoped to the date filter — drives byMonth, cumulative, per-source
  // and the headline totals. The Heatmap stays a trailing-53-weeks view over
  // ALL entries (independent of the filter), labeled as such.
  const entries = allEntries.filter((e) => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });

  // ---- byMonth: { month, hours, amount } over a CONTINUOUS month range ----
  // First bucket entries by month, then fill every month from the earliest to
  // the latest entry (gaps → 0) so a zero-activity month is NOT dropped and the
  // X-axis represents real, evenly-spaced time.
  const monthMap = new Map<string, { hours: number; amount: number }>();
  for (const e of entries) {
    const month = e.date.slice(0, 7); // YYYY-MM (local, no toISOString)
    const m = monthMap.get(month) ?? { hours: 0, amount: 0 };
    m.hours += e.hours;
    m.amount += e.amount;
    monthMap.set(month, m);
  }

  const presentMonths = [...monthMap.keys()].sort();
  const continuousMonths: string[] = [];
  if (presentMonths.length > 0) {
    let cur = presentMonths[0];
    const last = presentMonths[presentMonths.length - 1];
    // Bound the loop defensively (12 months per year, generous ceiling).
    for (let i = 0; i < 1000 && cur <= last; i++) {
      continuousMonths.push(cur);
      cur = nextMonth(cur);
    }
  }

  const byMonth: MonthPoint[] = continuousMonths.map((month) => {
    const v = monthMap.get(month) ?? { hours: 0, amount: 0 };
    return { month, hours: round2(v.hours), amount: round2(v.amount) };
  });

  // ---- source set for the cumulative chart + per-source table ----
  // Include a source if it is NOT archived OR it has ≥1 entry in scope. This
  // drops archived-and-unused sources while keeping archived-but-used ones so
  // their historical earnings still show.
  const usedSourceIds = new Set(entries.map((e) => e.sourceId));
  const visibleSources = sources.filter(
    (s) => !s.archived || usedSourceIds.has(s.id),
  );
  const sourceMeta: SourceMeta[] = visibleSources.map((s) => ({
    name: s.name,
    color: s.color,
  }));
  const nameById = new Map(sources.map((s) => [s.id, s.name]));

  // ---- bySourceCumulative: one row per continuous month ----
  // month -> sourceName -> amount for that month
  const perMonthPerSource = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    const name = nameById.get(e.sourceId);
    if (!name) continue;
    const inner = perMonthPerSource.get(month) ?? new Map<string, number>();
    inner.set(name, (inner.get(name) ?? 0) + e.amount);
    perMonthPerSource.set(month, inner);
  }

  const running = new Map<string, number>();
  const bySourceCumulative: CumulativeRow[] = byMonth.map((mp) => {
    const monthly = perMonthPerSource.get(mp.month);
    const row: CumulativeRow = { month: mp.month };
    for (const s of sourceMeta) {
      const add = monthly?.get(s.name) ?? 0;
      const total = (running.get(s.name) ?? 0) + add;
      running.set(s.name, total);
      row[s.name] = round2(total);
    }
    return row;
  });

  // ---- per-source summary table (scoped to the filter) ----
  const perSourceAgg = new Map<
    number,
    { hours: number; amount: number; days: Set<string> }
  >();
  for (const e of entries) {
    const agg =
      perSourceAgg.get(e.sourceId) ??
      { hours: 0, amount: 0, days: new Set<string>() };
    agg.hours += e.hours;
    agg.amount += e.amount;
    agg.days.add(e.date);
    perSourceAgg.set(e.sourceId, agg);
  }
  const sourceRows: SourceRow[] = visibleSources
    .map((s) => {
      const agg = perSourceAgg.get(s.id);
      const hours = round2(agg?.hours ?? 0);
      const amount = round2(agg?.amount ?? 0);
      return {
        name: s.name,
        color: s.color,
        hours,
        amount,
        perHour: hours > 0 ? round2(amount / hours) : 0,
        daysWorked: agg?.days.size ?? 0,
      };
    })
    // Only show rows with activity in the range (keeps the table meaningful).
    .filter((r) => r.hours > 0 || r.amount > 0 || r.daysWorked > 0)
    .sort((a, b) => b.amount - a.amount);

  // ---- byDayHours for the Heatmap: trailing 53 weeks over ALL entries ----
  const rangeStart = addDays(today, -(53 * 7 - 1));
  const byDayHours: Record<string, number> = {};
  for (const e of allEntries) {
    if (e.date < rangeStart || e.date > today) continue;
    byDayHours[e.date] = (byDayHours[e.date] ?? 0) + e.hours;
  }

  // ---- headline numbers (scoped to the filter) ----
  let totalAmount = 0;
  let totalHours = 0;
  for (const e of entries) {
    totalAmount += e.amount;
    totalHours += e.hours;
  }
  const avgPerHour = totalHours > 0 ? totalAmount / totalHours : 0;
  const bestMonthCandidate =
    byMonth.length > 0
      ? byMonth.reduce((a, b) => (b.amount > a.amount ? b : a))
      : null;
  // Only report a best month when it actually earned something.
  const bestMonth =
    bestMonthCandidate && bestMonthCandidate.amount > 0
      ? bestMonthCandidate
      : null;

  // Open period is over ALL entries (a period concept, not filter-scoped).
  const periods = buildPeriods(allEntries, markers);
  const open = periods[0]?.totals ?? null; // newest (open) first

  const stats: {
    label: string;
    value: string;
    count?: number;
    format?: (n: number) => string;
  }[] = [
    {
      label: "Total earned",
      value: fmtMoney(totalAmount),
      count: totalAmount,
      format: fmtMoney,
    },
    {
      label: "Avg $/h",
      value: totalHours > 0 ? fmtMoney(avgPerHour) : "—",
      count: totalHours > 0 ? avgPerHour : undefined,
      format: fmtMoney,
    },
    {
      label: "Best month",
      value: bestMonth ? `${fmtMoney(bestMonth.amount)} (${bestMonth.month})` : "—",
    },
    {
      label: "Open period",
      value: open ? `${fmtMoney(open.amount)} · ${fmtHours(open.hours)}` : "—",
    },
  ];

  // ---- goals stats ----
  const checksByGoal = new Map<number, string[]>();
  for (const c of allChecks) {
    const list = checksByGoal.get(c.goalId) ?? [];
    list.push(c.date);
    checksByGoal.set(c.goalId, list);
  }
  const thisMonth = today.slice(0, 7);
  const goalStats: GoalStat[] = allGoals
    .filter((g) => !g.archived)
    .map((g) => {
      const dates = checksByGoal.get(g.id) ?? [];
      return {
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        currentStreak: currentStreak(dates, today),
        bestStreak: bestStreak(dates),
        totalChecks: dates.length,
        checksThisMonth: dates.filter((d) => d.slice(0, 7) === thisMonth).length,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <Reveal
        onMount
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-2xl font-semibold heading-gradient">Stats</h1>
        <Button
          variant="outline"
          render={<a href="/api/export/work.csv" download />}
        >
          <DownloadIcon />
          Export CSV
        </Button>
      </Reveal>

      <FilterBar filter={{ from, to }} isFiltered={isFiltered} />

      {isFiltered && (
        <p className="text-xs text-muted-foreground">
          Charts, totals and the source table are scoped to the selected date
          range. The heatmap below always shows the last 53 weeks.
        </p>
      )}

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Reveal key={s.label} className="h-full">
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-lg font-semibold">
                  {s.count !== undefined && s.format ? (
                    <CountUp value={s.count} format={s.format} />
                  ) : (
                    s.value
                  )}
                </span>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </Stagger>

      <Reveal>
        <Charts
          byMonth={byMonth}
          bySourceCumulative={bySourceCumulative}
          sources={sourceMeta}
        />
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-2">
        <Reveal>
          <SourceTable rows={sourceRows} />
        </Reveal>
        <Reveal>
          <GoalsStats goals={goalStats} />
        </Reveal>
      </div>

      <Reveal>
        <Heatmap byDayHours={byDayHours} today={today} />
      </Reveal>
    </div>
  );
}
