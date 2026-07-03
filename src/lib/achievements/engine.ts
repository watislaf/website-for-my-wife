// Achievements ENGINE — a PURE evaluator. Given plain input data (already loaded
// from the DB by the actions layer), it returns EVERY currently-satisfied
// achievement instance. It performs NO IO: no `@/db`, no side effects. This keeps
// it fully unit-testable and safe to import anywhere server-side.
//
// The actions layer is responsible for persisting the returned instances (with
// onConflictDoNothing) so that already-earned instances stay earned.

import { ACHIEVEMENTS, type MetricId } from "./catalog";
import { buildPeriods, type WorkEntryLite, type MarkerLite } from "../periods";
import { currentStreak, bestStreak } from "../streaks";

export type EarnInput = {
  entries: { id: number; date: string; sourceId: number; hours: number; amount: number; note: string }[];
  markers: { id: number; endDate: string; name: string }[];
  sources: { id: number }[];
  goals: { id: number; archived: boolean }[];
  goalChecks: { goalId: number; date: string }[];
  planDoneCount: number;
  pageviews: { date: string; source: string }[]; // landing_events type=pageview
  clicksCount: number;
  distinctTrafficSources: number;
  subscribersCount: number;
  currentCoins: number; // sum of coins already earned (for the total_coins metric)
  today: string;
};

export type Earned = { key: string; instanceKey: string; coins: number };

/** One instance of an instance-scoped metric: a key + its measured value. */
type Instance = { instanceKey: string; value: number };

export function computeEarned(input: EarnInput): Earned[] {
  // ---- GLOBAL metric values (one number per metric id) ----
  const totalHours = sum(input.entries.map((e) => e.hours));
  const totalEarnings = sum(input.entries.map((e) => e.amount));
  const distinctDays = new Set(input.entries.map((e) => e.date)).size;

  const periods = buildPeriods(
    input.entries as WorkEntryLite[],
    input.markers as MarkerLite[],
  );
  const bestHourlyRate = periods.length
    ? Math.max(0, ...periods.map((p) => p.totals.perHour))
    : 0;

  // Group goal-check dates per goal so we can compute streaks.
  const datesByGoal = new Map<number, string[]>();
  for (const c of input.goalChecks) {
    const arr = datesByGoal.get(c.goalId);
    if (arr) arr.push(c.date);
    else datesByGoal.set(c.goalId, [c.date]);
  }
  const activeGoals = input.goals.filter((g) => !g.archived);
  const bestCurrent = activeGoals.length
    ? Math.max(
        0,
        ...activeGoals.map((g) =>
          currentStreak(datesByGoal.get(g.id) ?? [], input.today),
        ),
      )
    : 0;
  const bestEver = input.goals.length
    ? Math.max(0, ...input.goals.map((g) => bestStreak(datesByGoal.get(g.id) ?? [])))
    : 0;

  const globalValue: Record<Exclude<MetricId, InstanceMetric>, number> = {
    total_entries: input.entries.length,
    total_hours: totalHours,
    total_earnings: totalEarnings,
    total_days_worked: distinctDays,
    sources_created: input.sources.length,
    periods_closed: input.markers.length,
    goals_created: input.goals.length,
    total_goal_checks: input.goalChecks.length,
    best_current_streak: bestCurrent,
    best_ever_streak: bestEver,
    total_plan_done: input.planDoneCount,
    total_pageviews: input.pageviews.length,
    total_clicks: input.clicksCount,
    distinct_traffic_sources: input.distinctTrafficSources,
    subscribers: input.subscribersCount,
    best_hourly_rate: bestHourlyRate,
    total_coins: input.currentCoins,
  };

  // ---- INSTANCE metric values (a list of {instanceKey, value} per metric) ----
  const periodHours: Instance[] = periods.map((p) => ({
    instanceKey: `period:${p.marker?.id ?? "open"}`,
    value: p.totals.hours,
  }));
  const periodEarnings: Instance[] = periods.map((p) => ({
    instanceKey: `period:${p.marker?.id ?? "open"}`,
    value: p.totals.amount,
  }));

  const earningsBySource = new Map<number, number>();
  for (const e of input.entries) {
    earningsBySource.set(e.sourceId, (earningsBySource.get(e.sourceId) ?? 0) + e.amount);
  }
  const sourceEarnings: Instance[] = [...earningsBySource.entries()].map(
    ([id, amount]) => ({ instanceKey: `source:${id}`, value: amount }),
  );

  // perfect_day: for each DATE that has any check, value=1 iff there are active
  // goals AND every active goal has a check on that date.
  const checkedDatesByGoal = new Map<number, Set<string>>();
  for (const c of input.goalChecks) {
    const set = checkedDatesByGoal.get(c.goalId);
    if (set) set.add(c.date);
    else checkedDatesByGoal.set(c.goalId, new Set([c.date]));
  }
  const allCheckDates = new Set(input.goalChecks.map((c) => c.date));
  const perfectDay: Instance[] = [];
  if (activeGoals.length > 0) {
    for (const date of allCheckDates) {
      const allChecked = activeGoals.every((g) =>
        checkedDatesByGoal.get(g.id)?.has(date),
      );
      if (allChecked) perfectDay.push({ instanceKey: `day:${date}`, value: 1 });
    }
  }

  // day_pageviews: count pageviews per date.
  const pageviewsByDate = new Map<string, number>();
  for (const pv of input.pageviews) {
    pageviewsByDate.set(pv.date, (pageviewsByDate.get(pv.date) ?? 0) + 1);
  }
  const dayPageviews: Instance[] = [...pageviewsByDate.entries()].map(
    ([date, count]) => ({ instanceKey: `day:${date}`, value: count }),
  );

  const instanceValues: Record<InstanceMetric, Instance[]> = {
    period_hours: periodHours,
    period_earnings: periodEarnings,
    source_earnings: sourceEarnings,
    perfect_day: perfectDay,
    day_pageviews: dayPageviews,
  };

  // ---- Match every catalog def against the computed values ----
  const earned: Earned[] = [];
  for (const def of ACHIEVEMENTS) {
    if (def.scope === "global") {
      const value = globalValue[def.metric as Exclude<MetricId, InstanceMetric>];
      if (value >= def.threshold) {
        earned.push({ key: def.key, instanceKey: "", coins: def.coins });
      }
    } else {
      const instances = instanceValues[def.metric as InstanceMetric] ?? [];
      for (const inst of instances) {
        if (inst.value >= def.threshold) {
          earned.push({ key: def.key, instanceKey: inst.instanceKey, coins: def.coins });
        }
      }
    }
  }
  return earned;
}

// The instance-scoped metric ids (scope !== "global").
type InstanceMetric =
  | "period_hours"
  | "period_earnings"
  | "source_earnings"
  | "perfect_day"
  | "day_pageviews";

function sum(ns: number[]): number {
  let t = 0;
  for (const n of ns) t += n;
  return t;
}
