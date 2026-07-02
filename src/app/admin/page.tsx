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
} from "@/db/schema";
import { buildPeriods } from "@/lib/periods";
import { todayStr } from "@/lib/dates";
import { fmtMoney, fmtHours } from "@/components/work/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { TodayPlan } from "@/components/dashboard/TodayPlan";
import { TodayGoals } from "@/components/dashboard/TodayGoals";

export default async function DashboardPage() {
  const today = todayStr();

  const [todayPlan, activeGoals, todayChecks, entries, markers] =
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
    ]);

  const checkedIds = new Set(todayChecks.map((c) => c.goalId));
  const goalRows = activeGoals.map((g) => ({
    id: g.id,
    title: g.title,
    emoji: g.emoji,
    checkedToday: checkedIds.has(g.id),
  }));

  const periods = buildPeriods(entries, markers);
  const open = periods[0]?.totals ?? null;

  const chips: { label: string; value: string }[] = open
    ? [
        { label: "Earned", value: fmtMoney(open.amount) },
        { label: "Hours", value: fmtHours(open.hours) },
        { label: "$/h", value: fmtMoney(open.perHour) },
        { label: "Days worked", value: String(open.daysWorked) },
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
      <h1 className="text-2xl font-semibold heading-gradient">Dashboard</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&rsquo;s plan</CardTitle>
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
            <TodayPlan items={todayPlan} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&rsquo;s goals</CardTitle>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current period</CardTitle>
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
            {chips.length > 0 && open && open.hours + open.amount > 0 ? (
              <div className="flex flex-wrap gap-3">
                {chips.map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-col rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="text-base font-semibold">{c.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No work logged in the open period yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
