import { asc } from "drizzle-orm";
import { DownloadIcon } from "lucide-react";

import { db } from "@/db";
import { incomeSources, workEntries, periodMarkers } from "@/db/schema";
import { buildPeriods } from "@/lib/periods";
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

export default async function StatsPage() {
  const [sources, entries, markers] = await Promise.all([
    db.select().from(incomeSources).orderBy(asc(incomeSources.id)),
    db
      .select()
      .from(workEntries)
      .orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
  ]);

  const today = todayStr();

  // ---- byMonth: { month, hours, amount } sorted ascending ----
  const monthMap = new Map<string, { hours: number; amount: number }>();
  for (const e of entries) {
    const month = e.date.slice(0, 7); // YYYY-MM (local, no toISOString)
    const m = monthMap.get(month) ?? { hours: 0, amount: 0 };
    m.hours += e.hours;
    m.amount += e.amount;
    monthMap.set(month, m);
  }
  const byMonth: MonthPoint[] = [...monthMap.entries()]
    .map(([month, v]) => ({
      month,
      hours: Math.round(v.hours * 100) / 100,
      amount: Math.round(v.amount * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // ---- bySourceCumulative ----
  // One row per month present in byMonth. Each row carries a running
  // cumulative amount per (non-archived-or-used) source, keyed by source name:
  //   { month: "YYYY-MM", [sourceName]: cumulativeAmount, ... }
  // Consumed by the stacked AreaChart (one <Area dataKey={sourceName}> each).
  const sourceMeta: SourceMeta[] = sources.map((s) => ({
    name: s.name,
    color: s.color,
  }));
  const nameById = new Map(sources.map((s) => [s.id, s.name]));

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
      row[s.name] = Math.round(total * 100) / 100;
    }
    return row;
  });

  // ---- byDayHours: same window the Heatmap renders (53×7 grid ending today) ----
  const rangeStart = addDays(today, -(53 * 7 - 1));
  const byDayHours: Record<string, number> = {};
  for (const e of entries) {
    if (e.date < rangeStart || e.date > today) continue;
    byDayHours[e.date] = (byDayHours[e.date] ?? 0) + e.hours;
  }

  // ---- headline numbers ----
  let totalAmount = 0;
  let totalHours = 0;
  for (const e of entries) {
    totalAmount += e.amount;
    totalHours += e.hours;
  }
  const avgPerHour = totalHours > 0 ? totalAmount / totalHours : 0;
  const bestMonth =
    byMonth.length > 0
      ? byMonth.reduce((a, b) => (b.amount > a.amount ? b : a))
      : null;

  const periods = buildPeriods(entries, markers);
  const open = periods[0]?.totals ?? null; // newest (open) first

  const stats: { label: string; value: string }[] = [
    { label: "Total earned", value: fmtMoney(totalAmount) },
    { label: "Avg $/h", value: fmtMoney(avgPerHour) },
    {
      label: "Best month",
      value: bestMonth ? `${fmtMoney(bestMonth.amount)} (${bestMonth.month})` : "—",
    },
    {
      label: "Open period",
      value: open ? `${fmtMoney(open.amount)} · ${fmtHours(open.hours)}` : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold heading-gradient">Stats</h1>
        <Button
          variant="outline"
          render={<a href="/api/export/work.csv" download />}
        >
          <DownloadIcon />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-lg font-semibold">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Charts
        byMonth={byMonth}
        bySourceCumulative={bySourceCumulative}
        sources={sourceMeta}
      />

      <Heatmap byDayHours={byDayHours} today={today} />
    </div>
  );
}
