import { addDays } from "./dates";

function uniqSortedDesc(dates: string[]): string[] {
  return [...new Set(dates)].sort().reverse();
}

export function currentStreak(dates: string[], today: string): number {
  const ds = uniqSortedDesc(dates);
  if (ds.length === 0) return 0;
  // streak may end today or yesterday (today not yet checked)
  let cursor = ds[0] === today ? today : addDays(today, -1);
  if (ds[0] !== cursor) return 0;
  let streak = 0;
  for (const d of ds) {
    if (d !== cursor) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(dates: string[]): number {
  const ds = [...new Set(dates)].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of ds) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
