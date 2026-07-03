/**
 * Seed script — populates the dev SQLite DB with realistic demo data so the
 * admin dashboard, stats charts, year heatmap, work periods, goals, and planner
 * all render against non-trivial data.
 *
 * Run with:  npx tsx scripts/seed.ts
 *
 * Idempotent-ish: aborts (exit 0) if `income_sources` is already non-empty, so
 * re-running never duplicates. All dates are LOCAL (todayStr/addDays) — never
 * toISOString, which would drift a day depending on timezone.
 */
import { db } from "@/db";
import {
  incomeSources,
  workEntries,
  workDays,
  periodMarkers,
  goals,
  goalChecks,
  planItems,
} from "@/db/schema";
import { todayStr, addDays } from "@/lib/dates";

async function main() {
  const existing = await db.select().from(incomeSources);
  if (existing.length > 0) {
    console.log(
      `already seeded — income_sources has ${existing.length} row(s). Nothing inserted.`,
    );
    return;
  }

  const today = todayStr();
  // Start of the current month, e.g. "2026-07-01" for today "2026-07-02".
  const monthStart = `${today.slice(0, 7)}-01`;

  // ---- 1. income sources (distinct colors) ----
  const [clientA, streaming] = await db
    .insert(incomeSources)
    .values([
      { name: "Client A", color: "#ec4899" }, // pink
      { name: "Streaming", color: "#8b5cf6" }, // violet
    ])
    .returning();

  // ---- 2. ~40 work entries across the last ~3 months ----
  // Deterministic pseudo-random so re-seeding a fresh DB is reproducible.
  let s = 12345;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const dayHours = new Map<string, number>(); // date -> total hours
  const entries: { date: string; sourceId: number; amount: number; note: string }[] = [];

  const clientNotes = ["Feature work", "Bug fixes", "Meetings + review", "Refactor"];
  const streamNotes = ["Evening stream", "Cooking stream", "Q&A stream", "Collab"];

  // Walk back ~90 days; work roughly 3 of every 5 days, occasionally two sources.
  let dayOffset = 0;
  while (entries.length < 40 && dayOffset < 92) {
    const date = addDays(today, -dayOffset);
    dayOffset += 1;
    // Skip ~40% of days so daysWorked < calendar days (realistic).
    if (rand() < 0.4) continue;

    let hoursToday = 0;
    // Client A: steady weekday-ish work, ~4-8h at ~$45-70/h.
    if (rand() < 0.65) {
      const hours = Math.round((3 + rand() * 5) * 2) / 2; // 3.0–8.0 in .5 steps
      const rate = 45 + Math.round(rand() * 25);
      hoursToday += hours;
      entries.push({ date, sourceId: clientA.id, amount: Math.round(hours * rate), note: pick(clientNotes) });
    }

    // Streaming: shorter, lumpier income; sometimes same day as client work.
    if (rand() < 0.5) {
      const hours = Math.round((1.5 + rand() * 3) * 2) / 2; // 1.5–4.5
      hoursToday += hours;
      entries.push({ date, sourceId: streaming.id, amount: Math.round(20 + rand() * 180), note: pick(streamNotes) });
    }

    if (hoursToday > 0) dayHours.set(date, (dayHours.get(date) ?? 0) + hoursToday);
  }

  if (dayHours.size > 0) {
    await db.insert(workDays).values([...dayHours].map(([date, hours]) => ({ date, hours, note: "" })));
  }
  await db.insert(workEntries).values(entries);

  // ---- 3. one period marker at the start of the current month ----
  // Period covers (prevMarker.endDate, endDate]; a marker at "prev month last
  // day" (monthStart - 1) closes everything before this month, leaving the
  // current month as the OPEN period. We name it after the previous month.
  const closedEnd = addDays(monthStart, -1); // last day of previous month
  await db.insert(periodMarkers).values({
    endDate: closedEnd,
    name: `Closed ${closedEnd.slice(0, 7)}`,
  });

  // ---- 4. three goals with scattered checks over the last 3 weeks ----
  const [gGym, gCook, gRead] = await db
    .insert(goals)
    .values([
      { title: "Gym", emoji: "🏋️" },
      { title: "Cook something new", emoji: "🍳" },
      { title: "Read 20 pages", emoji: "📚" },
    ])
    .returning();

  // Gym: a strong current run (last 5 days incl. today) + an earlier cluster.
  const gymOffsets = [0, 1, 2, 3, 4, 8, 9, 10, 15, 16];
  // Cook: every other day-ish, no run to today (streak may be 0/short).
  const cookOffsets = [1, 3, 5, 7, 9, 12, 14, 18, 20];
  // Read: a consecutive run that ended yesterday (best streak, current 0 today).
  const readOffsets = [1, 2, 3, 4, 5, 6, 11, 12, 19];

  const checkRows: { goalId: number; date: string }[] = [];
  for (const o of gymOffsets) checkRows.push({ goalId: gGym.id, date: addDays(today, -o) });
  for (const o of cookOffsets) checkRows.push({ goalId: gCook.id, date: addDays(today, -o) });
  for (const o of readOffsets) checkRows.push({ goalId: gRead.id, date: addDays(today, -o) });
  await db.insert(goalChecks).values(checkRows);

  // ---- 5. five planner items: past / today / future, some done ----
  await db.insert(planItems).values([
    { date: addDays(today, -3), title: "Grocery run for the week", notes: "veg + proteins", done: true },
    { date: addDays(today, -1), title: "Edit last week's video", notes: "", done: true },
    { date: today, title: "Film Tuesday-night pasta episode", notes: "test the new lens", done: false },
    { date: today, title: "Reply to Client A brief", notes: "", done: false },
    { date: addDays(today, 4), title: "Plan next month's menu", notes: "seasonal produce", done: false },
  ]);

  console.log(
    `seeded: 2 sources, ${entries.length} work entries, 1 period marker (${closedEnd}), ` +
      `3 goals, ${checkRows.length} goal checks, 5 planner items.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
