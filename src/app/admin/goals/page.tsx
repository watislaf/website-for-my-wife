import { db } from "@/db";
import { goals, goalChecks } from "@/db/schema";
import { asc } from "drizzle-orm";
import { todayStr, addDays } from "@/lib/dates";
import { currentStreak, bestStreak } from "@/lib/streaks";
import { GoalsBoard, type GoalWithStats } from "@/components/goals/GoalsBoard";

export default async function GoalsPage() {
  const [allGoals, allChecks] = await Promise.all([
    db.select().from(goals).orderBy(asc(goals.id)),
    db.select().from(goalChecks),
  ]);

  const today = todayStr();
  const month = today.slice(0, 7); // YYYY-MM
  const last7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)); // [today-6 .. today]

  const checksByGoal = new Map<number, string[]>();
  for (const c of allChecks) {
    const arr = checksByGoal.get(c.goalId);
    if (arr) arr.push(c.date);
    else checksByGoal.set(c.goalId, [c.date]);
  }

  function toStats(id: number, title: string, emoji: string): GoalWithStats {
    const dates = checksByGoal.get(id) ?? [];
    const dateSet = new Set(dates);
    return {
      id,
      title,
      emoji,
      total: dates.length,
      month: dates.filter((d) => d.startsWith(month)).length,
      cur: currentStreak(dates, today),
      best: bestStreak(dates),
      last7: last7Days.map((d) => dateSet.has(d)),
      checkedToday: dateSet.has(today),
    };
  }

  const active = allGoals
    .filter((g) => !g.archived)
    .map((g) => toStats(g.id, g.title, g.emoji));

  const archived = allGoals
    .filter((g) => g.archived)
    .map((g) => ({ id: g.id, title: g.title, emoji: g.emoji }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold heading-gradient">Goals</h1>
      <GoalsBoard active={active} archived={archived} today={today} />
    </div>
  );
}
