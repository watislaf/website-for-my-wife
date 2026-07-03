import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  CalendarDays,
  Target,
  Briefcase,
  BarChart3,
  Activity,
} from "lucide-react";

import { db } from "@/db";
import {
  planItems,
  goals,
  goalChecks,
  workEntries,
  periodMarkers,
  incomeSources,
} from "@/db/schema";
import { buildPeriods } from "@/lib/periods";
import { todayStr } from "@/lib/dates";
import { fmtMoney, fmtHours, prettyDate } from "@/components/work/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { TodayPlan, type TodayPlanItem } from "@/components/dashboard/TodayPlan";
import { TodayGoals } from "@/components/dashboard/TodayGoals";
import { QuickAddPlan } from "@/components/dashboard/QuickAddPlan";
import { QuickAddWork } from "@/components/dashboard/QuickAddWork";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import { CountUp } from "@/components/motion/CountUp";

export default async function DashboardPage() {
  const today = todayStr();

  const [todayPlan, activeGoals, todayChecks, entries, markers, sources] =
    await Promise.all([
      db
        .select()
        .from(planItems)
        .where(eq(planItems.date, today))
        .orderBy(asc(planItems.id)),
      db
        .select()
        .from(goals)
        .where(eq(goals.archived, false))
        .orderBy(asc(goals.id)),
      db
        .select()
        .from(goalChecks)
        .where(eq(goalChecks.date, today)),
      db
        .select()
        .from(workEntries)
        .orderBy(asc(workEntries.date), asc(workEntries.id)),
      db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
      db
        .select()
        .from(incomeSources)
        .where(eq(incomeSources.archived, false))
        .orderBy(asc(incomeSources.id)),
    ]);

  // Typed contract: map raw rows to the exact shape <TodayPlan/> expects, so a
  // future schema rename breaks the build here instead of failing silently.
  const planRows: TodayPlanItem[] = todayPlan.map((p) => ({
    id: p.id,
    title: p.title,
    done: p.done,
  }));
  const planDone = planRows.filter((p) => p.done).length;

  const checkedIds = new Set(todayChecks.map((c) => c.goalId));
  const goalRows = activeGoals.map((g) => ({
    id: g.id,
    title: g.title,
    emoji: g.emoji,
    checkedToday: checkedIds.has(g.id),
  }));
  const goalsDone = goalRows.filter((g) => g.checkedToday).length;

  const activeSources = sources.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
  }));

  // buildPeriods returns newest (open, marker: null) first. The open bucket may
  // be empty if the latest work fell in an already-closed period, so fall back
  // to the most recent NON-EMPTY period and label the card by what it shows.
  const periods = buildPeriods(entries, markers);
  const openPeriod = periods[0] ?? null;
  const openIsEmpty =
    !openPeriod ||
    openPeriod.totals.hours + openPeriod.totals.amount === 0;
  const shownPeriod =
    openPeriod && !openIsEmpty
      ? openPeriod
      : periods.find((p) => p.totals.hours + p.totals.amount > 0) ?? null;
  const shownIsOpen = shownPeriod !== null && shownPeriod.marker === null;

  let periodLabel: string;
  if (!shownPeriod) {
    periodLabel = "Open period";
  } else if (shownIsOpen) {
    periodLabel = "Open period";
  } else {
    // Closed period fallback: label with its date range.
    const start = shownPeriod.startDate;
    const end = shownPeriod.endDate;
    periodLabel =
      start && end
        ? `Period ${prettyDate(start)} – ${prettyDate(end)}`
        : "Latest period";
  }

  const totals = shownPeriod?.totals ?? null;
  const chips: { label: string; value: number; format: (n: number) => string }[] =
    totals
      ? [
          { label: "Earned", value: totals.amount, format: fmtMoney },
          { label: "Hours", value: totals.hours, format: fmtHours },
          { label: "$/h", value: totals.perHour, format: fmtMoney },
          {
            label: "Days worked",
            value: totals.daysWorked,
            format: (n) => String(Math.round(n)),
          },
        ]
      : [];

  const sections = [
    { label: "Planner", href: "/admin/planner", icon: CalendarDays },
    { label: "Goals", href: "/admin/goals", icon: Target },
    { label: "Work", href: "/admin/work", icon: Briefcase },
    { label: "Stats", href: "/admin/stats", icon: BarChart3 },
    { label: "Traffic", href: "/admin/traffic", icon: Activity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Reveal onMount>
        <h1 className="text-2xl font-semibold heading-gradient">Dashboard</h1>
      </Reveal>

      <Stagger className="grid gap-6 lg:grid-cols-2">
        <Reveal className="h-full">
        <Card>
          <CardHeader>
            <CardTitle>
              Today&rsquo;s plan ({planDone}/{planRows.length} done)
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/admin/planner" />}
              >
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <TodayPlan items={planRows} />
            <QuickAddPlan />
          </CardContent>
        </Card>
        </Reveal>

        <Reveal className="h-full">
        <Card>
          <CardHeader>
            <CardTitle>
              Today&rsquo;s goals ({goalsDone}/{goalRows.length} done)
            </CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/admin/goals" />}
              >
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <TodayGoals goals={goalRows} today={today} />
          </CardContent>
        </Card>
        </Reveal>

        <Reveal className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{periodLabel}</CardTitle>
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/admin/work" />}
              >
                Open
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {chips.map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-col rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="text-base font-semibold">
                      <CountUp value={c.value} format={c.format} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No work logged yet.
              </p>
            )}
            <QuickAddWork sources={activeSources} />
          </CardContent>
        </Card>
        </Reveal>
      </Stagger>

      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Button key={s.href} variant="outline" render={<Link href={s.href} />}>
              <Icon />
              {s.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
