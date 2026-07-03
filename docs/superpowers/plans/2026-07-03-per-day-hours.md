# Per-day hours + holiday days — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move work hours from per-income-source to per-day, with per-source income lines, and report holiday/off days on finished periods.

**Architecture:** New `work_days` table holds one hours value per date; `work_entries` becomes pure income lines `(date, sourceId, amount, note)` with a unique `(date, sourceId)`. `buildPeriods` consumes both tables. A shared "log/edit a day" dialog upserts a day + its income lines and can edit any past day. Closed periods gain a `holidayDays` count = calendar span − days worked.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM + libSQL/Turso, Vitest, Base UI (shadcn v4), Tailwind, motion/react, sonner.

**Read before coding:** `AGENTS.md` — this is a modified Next.js; consult `node_modules/next/dist/docs/` before writing Next-specific code.

**Sequencing note:** Unit-test tasks (Tasks 2, 6) pass in isolation under Vitest (esbuild transpiles per-file, no full typecheck). The full app will only typecheck (`npm run build`) after every consumer is updated — that is the final verification (Task 11). Commit per task regardless.

---

## File map

- `src/db/schema.ts` — add `workDays`; slim `workEntries` (drop `hours`, add unique `(date, sourceId)`).
- `drizzle/000X_*.sql` (generated, then overwritten) — schema + data migration.
- `src/lib/dates.ts` — add `daysBetween`.
- `src/lib/periods.ts` — new types + `buildPeriods(days, entries, markers)` + `holidayDays`.
- `src/lib/periods.test.ts` — updated to new signature; holiday-day tests.
- `src/actions/work.ts` — `saveDay`, `deleteDay`, `quickAddToday`; remove per-entry `hours`/actions.
- `src/lib/achievements/engine.ts` + `.test.ts` — add `days` to `EarnInput`; source hours from it.
- `src/actions/achievements.ts` — load `work_days`, pass `days`.
- `src/app/admin/work/page.tsx` — load `work_days`; filter; `buildPeriods`.
- `src/components/work/WorkBoard.tsx` — replace quick-add with the day dialog; `bySource` type.
- `src/components/work/PeriodCard.tsx` — group by day; day edit/delete; holiday chip.
- `src/app/admin/stats/page.tsx` — hours from `work_days`; source rows without hours.
- `src/components/stats/SourceTable.tsx` — drop Hours / $/h columns.
- `src/components/dashboard/QuickAddWork.tsx` — use `quickAddToday`.
- `src/app/api/export/work.csv/route.ts` — new CSV shape.
- `scripts/seed.ts` — seed `work_days` + income lines.

---

## Task 1: Schema — add `work_days`, slim `work_entries`

**Files:**
- Modify: `src/db/schema.ts:35-42`

- [ ] **Step 1: Replace the `workEntries` table and add `workDays`**

In `src/db/schema.ts`, replace the current `workEntries` definition (lines 35-42) with:

```ts
export const workDays = sqliteTable("work_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),              // YYYY-MM-DD, one row per day
  hours: real("hours").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const workEntries = sqliteTable("work_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  sourceId: integer("source_id").notNull().references(() => incomeSources.id),
  amount: real("amount").notNull().default(0),
  note: text("note").notNull().default(""),
}, (t) => [unique("work_entry_date_source").on(t.date, t.sourceId)]);
```

`unique` is already imported at the top of the file. `real` is too.

- [ ] **Step 2: Typecheck the schema file only**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -c "schema.ts"`
Expected: `0` (no errors originating in schema.ts itself; other files will still error — that's expected until later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(work): add work_days table, slim work_entries to income lines"
```

---

## Task 2: `periods.ts` — new signature, totals, holiday days (TDD)

**Files:**
- Modify: `src/lib/dates.ts` (append)
- Modify: `src/lib/periods.ts` (full rewrite of types + functions)
- Test: `src/lib/periods.test.ts` (rewrite)

- [ ] **Step 1: Add `daysBetween` to `src/lib/dates.ts`**

Append:

```ts
/** Whole calendar days from `from` to `to` (to − from). Negative if to < from.
 *  Uses UTC midnight so DST never shifts the count. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}
```

- [ ] **Step 2: Write the failing tests** — replace `src/lib/periods.test.ts` entirely with:

```ts
import { describe, it, expect } from "vitest";
import { buildPeriods, lifetimeTotals, WorkDayLite, WorkEntryLite, MarkerLite } from "./periods";

const day = (id: number, date: string, hours: number): WorkDayLite =>
  ({ id, date, hours, note: "" });
const inc = (id: number, date: string, sourceId: number, amount: number): WorkEntryLite =>
  ({ id, date, sourceId, amount, note: "" });
const m = (id: number, endDate: string): MarkerLite => ({ id, endDate, name: "" });

describe("buildPeriods", () => {
  it("splits days + entries at marker boundaries (inclusive end)", () => {
    const periods = buildPeriods(
      [day(1, "2026-06-01", 4), day(2, "2026-06-15", 2), day(3, "2026-06-16", 8)],
      [inc(1, "2026-06-01", 1, 100), inc(2, "2026-06-15", 1, 50), inc(3, "2026-06-16", 2, 200)],
      [m(1, "2026-06-15")],
    );
    expect(periods).toHaveLength(2); // open first, then closed
    expect(periods[0].marker).toBeNull();
    expect(periods[0].days.map((d) => d.id)).toEqual([3]);
    expect(periods[1].days.map((d) => d.id)).toEqual([1, 2]);
    expect(periods[1].totals).toMatchObject({ hours: 6, amount: 150, daysWorked: 2, perHour: 25 });
    expect(periods[1].totals.bySource[1]).toEqual({ amount: 150 });
  });

  it("hours come only from work_days, never from income lines", () => {
    // 6h day, two income lines the same day → hours = 6 (not double-counted).
    const [open] = buildPeriods(
      [day(1, "2026-06-01", 6)],
      [inc(1, "2026-06-01", 1, 30), inc(2, "2026-06-01", 2, 20)],
      [],
    );
    expect(open.totals.hours).toBe(6);
    expect(open.totals.amount).toBe(50);
    expect(open.totals.daysWorked).toBe(1);
    expect(open.totals.perHour).toBe(50 / 6 === 8.333333333333334 ? 8.33 : 8.33);
  });

  it("allows an hours-only day (no income): perHour is 0, not NaN", () => {
    const [open] = buildPeriods([day(1, "2026-06-01", 5)], [], []);
    expect(open.totals.hours).toBe(5);
    expect(open.totals.amount).toBe(0);
    expect(open.totals.perHour).toBe(0);
    expect(open.totals.daysWorked).toBe(1);
  });

  it("open period has holidayDays = null", () => {
    const [open] = buildPeriods([day(1, "2026-06-01", 5)], [], []);
    expect(open.totals.holidayDays).toBeNull();
  });

  it("closed period counts unlogged + zero-hour days as holidays (full span)", () => {
    // First-ever period: span starts at first logged day (2026-06-01) through
    // the marker end (2026-06-05) = 5 calendar days. Worked days (hours>0): 06-01,
    // 06-03. 06-04 logged with 0h counts as holiday. → 5 - 2 = 3 holidays.
    const periods = buildPeriods(
      [day(1, "2026-06-01", 4), day(2, "2026-06-03", 6), day(3, "2026-06-04", 0)],
      [inc(1, "2026-06-01", 1, 40)],
      [m(1, "2026-06-05")],
    );
    const closed = periods[1];
    expect(closed.totals.daysWorked).toBe(2);
    expect(closed.totals.holidayDays).toBe(3);
  });

  it("uses prev-marker boundary as span start for a later period", () => {
    // Period 2 spans (06-15, 06-30] = 06-16..06-30 = 15 days. One worked day.
    const periods = buildPeriods(
      [day(1, "2026-06-10", 5), day(2, "2026-06-20", 5)],
      [],
      [m(1, "2026-06-15"), m(2, "2026-06-30")],
    );
    const june = periods.find((p) => p.marker?.id === 2)!;
    expect(june.totals.daysWorked).toBe(1);
    expect(june.totals.holidayDays).toBe(14); // 15 span − 1 worked
  });

  it("single worked-day closed period = 0 holidays", () => {
    const periods = buildPeriods([day(1, "2026-06-05", 8)], [], [m(1, "2026-06-05")]);
    expect(periods[1].totals.holidayDays).toBe(0);
  });

  it("lifetimeTotals sums across everything with holidayDays null", () => {
    const t = lifetimeTotals(
      [day(1, "2026-06-01", 4), day(2, "2026-06-02", 6)],
      [inc(1, "2026-06-01", 1, 40)],
    );
    expect(t).toMatchObject({ hours: 10, amount: 40, daysWorked: 2, holidayDays: null });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- periods`
Expected: FAIL — `buildPeriods` has the old signature / `WorkDayLite` not exported.

- [ ] **Step 4: Rewrite `src/lib/periods.ts`** with:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- periods`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/dates.ts src/lib/periods.ts src/lib/periods.test.ts
git commit -m "feat(periods): per-day hours totals + holiday days"
```

---

## Task 3: `actions/work.ts` — day-oriented actions

**Files:**
- Modify: `src/actions/work.ts` (replace the "work entries" section, lines 24-124)

- [ ] **Step 1: Update imports and validation**

At the top, change the schema import (line 4) to include `workDays`:

```ts
import { incomeSources, workEntries, workDays, periodMarkers } from "@/db/schema";
```

Ensure drizzle imports include `and`:

```ts
import { eq, and, count } from "drizzle-orm";
```

- [ ] **Step 2: Replace the `assertEntry` helper and the entire `/* ---------- work entries ---------- */` section** (from `function assertEntry` through `deleteEntry`, lines 24-124) with:

```ts
type IncomeLine = { sourceId: number; amount: number; note?: string };

function assertDayInput(hours: number, lines: IncomeLine[]) {
  if (!Number.isFinite(hours) || hours < 0)
    throw new Error("Hours must be a non-negative number");
  const seen = new Set<number>();
  for (const l of lines) {
    if (!l.sourceId) throw new Error("Each income line needs a source");
    if (seen.has(l.sourceId)) throw new Error("One income line per source per day");
    seen.add(l.sourceId);
    if (!Number.isFinite(l.amount)) throw new Error("Amount must be a finite number");
  }
}

/* ---------- work: a day + its income lines ---------- */

/**
 * Upsert one day: its hours/note and the FULL set of income lines for that date.
 * Lines are replaced wholesale (delete any for the date not present, upsert the
 * rest). Clearing everything (0 hours, no lines) deletes the day.
 */
export async function saveDay(data: {
  date: string;
  hours: number;
  note?: string;
  lines: IncomeLine[];
}) {
  assertDate(data.date);
  assertDayInput(data.hours, data.lines);

  if (data.hours === 0 && data.lines.length === 0) {
    await deleteDay(data.date);
    return;
  }

  await db
    .insert(workDays)
    .values({ date: data.date, hours: data.hours, note: data.note?.trim() ?? "" })
    .onConflictDoUpdate({
      target: workDays.date,
      set: { hours: data.hours, note: data.note?.trim() ?? "" },
    });

  // Replace income lines for the date: delete those no longer present, upsert rest.
  const keepIds = data.lines.map((l) => l.sourceId);
  const existing = await db
    .select({ sourceId: workEntries.sourceId })
    .from(workEntries)
    .where(eq(workEntries.date, data.date));
  for (const row of existing) {
    if (!keepIds.includes(row.sourceId)) {
      await db
        .delete(workEntries)
        .where(and(eq(workEntries.date, data.date), eq(workEntries.sourceId, row.sourceId)));
    }
  }
  for (const l of data.lines) {
    await db
      .insert(workEntries)
      .values({ date: data.date, sourceId: l.sourceId, amount: l.amount, note: l.note?.trim() ?? "" })
      .onConflictDoUpdate({
        target: [workEntries.date, workEntries.sourceId],
        set: { amount: l.amount, note: l.note?.trim() ?? "" },
      });
  }
  revalidate();
}

export async function deleteDay(date: string) {
  assertDate(date);
  await db.delete(workEntries).where(eq(workEntries.date, date));
  await db.delete(workDays).where(eq(workDays.date, date));
  revalidate();
}

/** Dashboard quick-add for TODAY: set today's hours and upsert one income line. */
export async function quickAddToday(data: {
  sourceId: number;
  hours: number;
  amount: number;
  note?: string;
}) {
  const date = todayStr();
  assertDayInput(data.hours, [{ sourceId: data.sourceId, amount: data.amount }]);

  await db
    .insert(workDays)
    .values({ date, hours: data.hours, note: "" })
    .onConflictDoUpdate({ target: workDays.date, set: { hours: data.hours } });

  await db
    .insert(workEntries)
    .values({ date, sourceId: data.sourceId, amount: data.amount, note: data.note?.trim() ?? "" })
    .onConflictDoUpdate({
      target: [workEntries.date, workEntries.sourceId],
      set: { amount: data.amount, note: data.note?.trim() ?? "" },
    });
  revalidate();
}
```

Note: `deleteSource`'s guard (queries `workEntries` by `sourceId`) still works unchanged — keep it.

- [ ] **Step 3: Typecheck this file**

Run: `npx tsc --noEmit 2>&1 | grep "actions/work.ts" || echo "work.ts OK"`
Expected: `work.ts OK` (other files still error until their tasks land).

- [ ] **Step 4: Commit**

```bash
git add src/actions/work.ts
git commit -m "feat(work): saveDay/deleteDay/quickAddToday actions"
```

---

## Task 4: Migration — create `work_days`, populate from history, dedup income

**Files:**
- Create: `drizzle/000X_per_day_hours.sql` (generated, then overwritten)

- [ ] **Step 1: Generate a migration from the schema diff**

Run: `npm run db:generate`
Expected: a new file `drizzle/0006_<random>.sql` appears (number is one past the current highest, 0005) plus an updated `drizzle/meta/` snapshot + `_journal.json`. Note the exact filename.

- [ ] **Step 2: Overwrite the generated `.sql` with the data-preserving migration**

Replace the ENTIRE contents of that new `drizzle/0006_*.sql` file with:

```sql
CREATE TABLE `work_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`hours` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_days_date_unique` ON `work_days` (`date`);
--> statement-breakpoint
INSERT INTO `work_days` (`date`, `hours`, `note`)
	SELECT `date`, SUM(`hours`), '' FROM `work_entries` GROUP BY `date`;
--> statement-breakpoint
CREATE TABLE `__new_work_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`source_id` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_work_entries` (`date`, `source_id`, `amount`, `note`)
	SELECT `date`, `source_id`, SUM(`amount`), MAX(`note`)
	FROM `work_entries` GROUP BY `date`, `source_id`;
--> statement-breakpoint
DROP TABLE `work_entries`;
--> statement-breakpoint
ALTER TABLE `__new_work_entries` RENAME TO `work_entries`;
--> statement-breakpoint
CREATE UNIQUE INDEX `work_entry_date_source` ON `work_entries` (`date`,`source_id`);
```

Why hand-written: drizzle's auto-diff would drop the `hours` column before we can sum it into `work_days`, and would fail creating the unique index if any duplicate `(date, source_id)` rows exist. `MAX(note)` keeps a non-empty note when merging duplicates (empty string sorts lowest). The end-state schema matches the snapshot drizzle just generated, so the journal stays valid.

- [ ] **Step 3: Back up the dev DB and apply the migration**

```bash
cp data/app.db data/app.db.bak 2>/dev/null || echo "no dev db yet"
npm run db:migrate
```
Expected: prints `migrated` with no error.

- [ ] **Step 4: Verify the migration transformed data correctly**

Run:
```bash
npx tsx -e "import {createClient} from '@libsql/client'; const c=createClient({url:'file:'+(process.env.DATABASE_PATH??'./data/app.db')}); const d=await c.execute('select count(*) n, coalesce(sum(hours),0) h from work_days'); const e=await c.execute('select count(*) n, count(distinct date||\":\"||source_id) u from work_entries'); console.log('work_days',d.rows[0]); console.log('work_entries',e.rows[0]);"
```
Expected: `work_days` count = number of distinct dates that had entries; `work_entries` `n === u` (every `(date, source_id)` is unique — no dupes survived).

- [ ] **Step 5: Commit**

```bash
git add drizzle/
git commit -m "feat(db): migration to per-day hours (preserves history)"
```

---

## Task 5: Wire the Work page data load

**Files:**
- Modify: `src/app/admin/work/page.tsx`

- [ ] **Step 1: Load `work_days`, filter, and build periods with the new signature**

Replace the imports and body so it loads `workDays` and passes both collections to `buildPeriods`/`lifetimeTotals`. Full file:

```tsx
import { db } from "@/db";
import { incomeSources, workEntries, workDays, periodMarkers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildPeriods, lifetimeTotals } from "@/lib/periods";
import { todayStr } from "@/lib/dates";
import { WorkBoard } from "@/components/work/WorkBoard";
import { Reveal } from "@/components/motion/Reveal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const sourceRaw = firstParam(sp.source);
  const sourceId = /^\d+$/.test(sourceRaw) ? Number(sourceRaw) : null;
  const from = DATE_RE.test(firstParam(sp.from)) ? firstParam(sp.from) : "";
  const to = DATE_RE.test(firstParam(sp.to)) ? firstParam(sp.to) : "";

  const [sources, allEntries, allDays, markers] = await Promise.all([
    db.select().from(incomeSources).orderBy(asc(incomeSources.id)),
    db.select().from(workEntries).orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(workDays).orderBy(asc(workDays.date), asc(workDays.id)),
    db.select().from(periodMarkers).orderBy(asc(periodMarkers.endDate)),
  ]);

  // Lifetime totals over ALL data, independent of filters.
  const lifetime = lifetimeTotals(allDays, allEntries);

  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const filteredEntries = allEntries.filter(
    (e) => inRange(e.date) && (sourceId === null || e.sourceId === sourceId),
  );
  // Days: apply the date range always; when a source filter is active, keep only
  // days on which that source earned (so hours/$/h stay meaningful).
  const datesWithSource = sourceId === null ? null : new Set(filteredEntries.map((e) => e.date));
  const filteredDays = allDays.filter(
    (d) => inRange(d.date) && (datesWithSource === null || datesWithSource.has(d.date)),
  );

  const isFiltered = sourceId !== null || Boolean(from) || Boolean(to);
  const periods = buildPeriods(filteredDays, filteredEntries, markers);

  return (
    <div className="flex flex-col gap-6">
      <Reveal onMount>
        <h1 className="text-2xl font-semibold heading-gradient">Work</h1>
      </Reveal>
      <Reveal>
        <WorkBoard
          sources={sources}
          periods={periods}
          today={todayStr()}
          lifetime={lifetime}
          filter={{ source: sourceId, from, to }}
          isFiltered={isFiltered}
        />
      </Reveal>
    </div>
  );
}
```

- [ ] **Step 2: Commit** (page won't fully typecheck until WorkBoard/PeriodCard land — that's fine)

```bash
git add src/app/admin/work/page.tsx
git commit -m "feat(work): load work_days and build periods from both tables"
```

---

## Task 6: Achievements engine + loader (TDD)

**Files:**
- Modify: `src/lib/achievements/engine.ts`
- Modify: `src/lib/achievements/engine.test.ts`
- Modify: `src/actions/achievements.ts`

- [ ] **Step 1: Update the engine tests** — in `src/lib/achievements/engine.test.ts`:

  a. Add `days: [],` to the `baseInput` return object (right after `entries: [],`).

  b. The two existing tests that put hours on entries must move hours to `days`. Replace the `marathoner` test's input with:

```ts
    const input = baseInput({
      days: [{ id: 1, date: "2026-07-01", hours: 120, note: "" }],
      entries: [{ id: 1, date: "2026-07-01", sourceId: 1, amount: 6000, note: "" }],
    });
```

  And the `hard-worker-1` per-period test's input with:

```ts
    const input = baseInput({
      days: [
        { id: 1, date: "2026-05-10", hours: 40, note: "" },
        { id: 2, date: "2026-06-10", hours: 45, note: "" },
      ],
      entries: [
        { id: 1, date: "2026-05-10", sourceId: 1, amount: 400, note: "" },
        { id: 2, date: "2026-06-10", sourceId: 1, amount: 450, note: "" },
      ],
      markers: [
        { id: 100, endDate: "2026-05-31", name: "May" },
        { id: 101, endDate: "2026-06-30", name: "June" },
      ],
    });
```

  For any OTHER test in the file that sets `entries: [{ ... hours: N ... }]`, remove `hours` from the entry object and add a matching `days` array with that date/hours. (Search the file for `hours:` and fix each — entries no longer carry hours.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- engine`
Expected: FAIL — `EarnInput` has no `days`; totals derived from `entries.hours` (now absent).

- [ ] **Step 3: Update `src/lib/achievements/engine.ts`**

  a. Change the `entries` type (remove `hours`) and add `days` to `EarnInput` (lines 13-14):

```ts
export type EarnInput = {
  days: { id: number; date: string; hours: number; note: string }[];
  entries: { id: number; date: string; sourceId: number; amount: number; note: string }[];
  markers: { id: number; endDate: string; name: string }[];
  sources: { id: number }[];
```

  b. Update the import to include `WorkDayLite` (line 10):

```ts
import { buildPeriods, type WorkDayLite, type WorkEntryLite, type MarkerLite } from "../periods";
```

  c. Replace the three global derivations (lines 43-45):

```ts
  const totalHours = sum(input.days.map((d) => d.hours));
  const totalEarnings = sum(input.entries.map((e) => e.amount));
  const distinctDays = new Set(input.days.filter((d) => d.hours > 0).map((d) => d.date)).size;
```

  d. Update the `buildPeriods` call (lines 47-50):

```ts
  const periods = buildPeriods(
    input.days as WorkDayLite[],
    input.entries as WorkEntryLite[],
    input.markers as MarkerLite[],
  );
```

  Everything else (source earnings from `input.entries`, period_hours from `p.totals.hours`, etc.) stays — `p.totals.hours` now comes from days automatically.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- engine`
Expected: PASS.

- [ ] **Step 5: Load `work_days` in `src/actions/achievements.ts`**

  a. Add `workDays` to the schema import (line 5 area):

```ts
import {
  workEntries,
  workDays,
  periodMarkers,
```

  b. In the `Promise.all` destructuring (line 44), add `dayRows,` as the first element and a matching query. Change the array head to:

```ts
    const [
      dayRows,
      entries,
      markers,
```

  and insert this query as the FIRST element of the `Promise.all([...])` (before the `entries` query at line 57):

```ts
      db
        .select({ id: workDays.id, date: workDays.date, hours: workDays.hours, note: workDays.note })
        .from(workDays),
```

  c. Remove `hours: workEntries.hours,` from the `entries` select (line 62).

  d. In the `computeEarned({ ... })` call (line 119), add `days: dayRows,` right before `entries,`:

```ts
    const earned = computeEarned({
      days: dayRows,
      entries,
      markers,
```

- [ ] **Step 6: Typecheck this file**

Run: `npx tsc --noEmit 2>&1 | grep "achievements" || echo "achievements OK"`
Expected: `achievements OK`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/achievements/engine.ts src/lib/achievements/engine.test.ts src/actions/achievements.ts
git commit -m "feat(achievements): derive hours/days-worked from work_days"
```

---

## Task 7: WorkBoard — replace quick-add with the day dialog

**Files:**
- Modify: `src/components/work/WorkBoard.tsx`

- [ ] **Step 1: Update imports and the `bySource` consumer**

  - Change the actions import to drop `createEntry` and add `saveDay`:

```ts
import {
  createSource,
  setSourceArchived,
  updateSource,
  deleteSource,
  saveDay,
} from "@/actions/work";
```

  - Nothing in `LifetimeStrip`/`Stat` changes.

- [ ] **Step 2: Replace `QuickAddForm` (lines 477-615) with a reusable `DayDialog` + a "Log a day" trigger**

Replace the whole `/* ---------- 2. Quick add ---------- */` section with a shared day editor used both here and by `PeriodCard`. Create the editor as an exported component so `PeriodCard` imports it:

```tsx
/* ---------- 2. Day editor (add + edit any day) ---------- */

export type DayLine = { sourceId: number; amount: string; note: string };

export function DayDialog({
  active,
  allSources,
  today,
  initial,
  trigger,
}: {
  active: Source[];               // selectable (non-archived) sources
  allSources: Source[];           // for showing an existing line whose source was archived
  today: string;
  initial?: { date: string; hours: string; note: string; lines: DayLine[] };
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initial?.date ?? today);
  const [hours, setHours] = useState(initial?.hours ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [lines, setLines] = useState<DayLine[]>(initial?.lines ?? []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Re-seed on open so editing a re-bucketed row shows fresh values.
  function handleOpenChange(next: boolean) {
    if (next) {
      setDate(initial?.date ?? today);
      setHours(initial?.hours ?? "");
      setNote(initial?.note ?? "");
      setLines(initial?.lines ?? []);
    }
    setOpen(next);
  }

  const usedIds = new Set(lines.map((l) => l.sourceId));
  const addableSources = active.filter((s) => !usedIds.has(s.id));

  function addLine() {
    const next = addableSources[0];
    if (!next) {
      toast.error("No more sources — add one under “Manage sources”");
      return;
    }
    setLines((ls) => [...ls, { sourceId: next.id, amount: "", note: "" }]);
  }
  function setLine(i: number, patch: Partial<DayLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    const h = hours === "" ? 0 : Number(hours);
    if (!Number.isFinite(h) || h < 0) {
      toast.error("Hours must be a non-negative number");
      return;
    }
    const parsed = lines.map((l) => ({
      sourceId: l.sourceId,
      amount: l.amount === "" ? 0 : Number(l.amount),
      note: l.note,
    }));
    if (parsed.some((l) => !Number.isFinite(l.amount))) {
      toast.error("Each amount must be a number");
      return;
    }
    if (h === 0 && parsed.length === 0) {
      toast.error("Enter hours or at least one income line");
      return;
    }
    startTransition(async () => {
      try {
        await saveDay({ date, hours: h, note: note.trim(), lines: parsed });
        setOpen(false);
        toast.success("Day saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save day");
      }
    });
  }

  const byId = new Map(allSources.map((s) => [s.id, s]));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a day</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Date */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="justify-start">
                  <CalendarIcon />
                  {prettyDate(date)}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={strToDate(date)}
                onSelect={(d) => {
                  if (d) setDate(dateToStr(d));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Hours (per day) */}
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="Hours worked this day"
            aria-label="Hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />

          {/* Income lines */}
          <div className="flex flex-col gap-2">
            {lines.map((l, i) => {
              const s = byId.get(l.sourceId);
              // Source options for THIS line = this line's source + still-free ones.
              const options = active.filter(
                (o) => o.id === l.sourceId || !usedIds.has(o.id),
              );
              return (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    items={options.map((o) => ({ value: o.id, label: o.name }))}
                    value={l.sourceId}
                    onValueChange={(v) => setLine(i, { sourceId: v as number })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
                            {o.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    aria-label={`Amount for ${s?.name ?? "source"}`}
                    value={l.amount}
                    onChange={(e) => setLine(i, { amount: e.target.value })}
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => removeLine(i)} aria-label="Remove income line">
                    <XIcon />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={addLine} className="self-start">
              Add income
            </Button>
          </div>

          <Input
            placeholder="Day note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <PendingButton onClick={handleSave} pending={pending} pendingLabel="Saving…">
            Save day
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Add the missing imports to the top of `WorkBoard.tsx`:

```ts
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
```

(`DialogClose` and `DialogFooter` are new here; keep the existing ones.)

- [ ] **Step 3: Use `DayDialog` in `WorkBoard`'s render**

In the `WorkBoard` component body (currently line 109 `<QuickAddForm active={active} today={today} />`), replace with:

```tsx
      <DayDialog
        active={active}
        allSources={sources}
        today={today}
        trigger={<Button>Log a day</Button>}
      />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/work/WorkBoard.tsx
git commit -m "feat(work): day editor dialog (hours + income lines)"
```

---

## Task 8: PeriodCard — group by day, day edit/delete, holiday chip

**Files:**
- Modify: `src/components/work/PeriodCard.tsx`

- [ ] **Step 1: Update imports**

  - Drop `createEntry, updateEntry, deleteEntry` and add `deleteDay`:

```ts
import { createMarker, updateMarker, deleteMarker, deleteDay } from "@/actions/work";
```

  - Import the shared editor + line type and add `WorkDayLite`:

```ts
import type { PeriodSummary, WorkEntryLite, WorkDayLite } from "@/lib/periods";
import { DayDialog, type DayLine, type Source } from "./WorkBoard";
```

  (Remove the old `import type { Source } from "./WorkBoard";` line — it's merged above.)

- [ ] **Step 2: Build a per-day view model and render day rows**

In `PeriodCard`, after destructuring `const { marker, startDate, endDate, entries, totals } = period;`, also pull `days`:

```tsx
  const { marker, startDate, endDate, days, entries, totals } = period;
```

Replace the `bySource` block (lines 91-93) — it now has no hours:

```tsx
  const bySource = Object.entries(totals.bySource).sort(
    (a, b) => b[1].amount - a[1].amount,
  );
```

Add, before the return, a grouping of entries by date and a merged day list:

```tsx
  const entriesByDate = new Map<string, WorkEntryLite[]>();
  for (const e of entries) {
    const arr = entriesByDate.get(e.date) ?? [];
    arr.push(e);
    entriesByDate.set(e.date, arr);
  }
  // Every date that has hours OR income, newest first.
  const dayByDate = new Map(days.map((d) => [d.date, d]));
  const allDates = [...new Set([...days.map((d) => d.date), ...entries.map((e) => e.date)])]
    .sort()
    .reverse();
```

- [ ] **Step 3: Update the stat chips to include holiday days**

Replace the per-source aggregate `<span>{fmtHours(agg.hours)}</span> <span>·</span>` inside the `bySource.map(...)` (lines 165-167) — remove the hours span, keep amount:

```tsx
                        <span className="flex-1 truncate">{s?.name ?? "Unknown"}</span>
                        <span>{fmtMoney(agg.amount)}</span>
```

Add a holiday chip after the `$/h` chip (after line 133), shown only for closed periods:

```tsx
        {totals.holidayDays !== null && (
          <Chip label={`${totals.holidayDays.toLocaleString()} off`} />
        )}
```

- [ ] **Step 4: Replace the entries `<Table>` (lines 174-203) with day rows**

```tsx
              {allDates.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {allDates.map((d) => {
                    const wd = dayByDate.get(d);
                    const dayEntries = entriesByDate.get(d) ?? [];
                    const dayAmount = dayEntries.reduce((a, e) => a + e.amount, 0);
                    return (
                      <DayRow
                        key={d}
                        date={d}
                        hours={wd?.hours ?? 0}
                        note={wd?.note ?? ""}
                        entries={dayEntries}
                        dayAmount={dayAmount}
                        sources={sources}
                        byId={byId}
                        today={today}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No entries in this period.</p>
              )}
```

- [ ] **Step 5: Replace the old `EntryRow` + `EditEntryDialog` (lines 224-487) with `DayRow`**

```tsx
/* ---------- one day: hours + its income lines, edit/delete ---------- */

function DayRow({
  date,
  hours,
  note,
  entries,
  dayAmount,
  sources,
  byId,
  today,
}: {
  date: string;
  hours: number;
  note: string;
  entries: WorkEntryLite[];
  dayAmount: number;
  sources: Source[];
  byId: Map<number, Source>;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();
  const active = sources.filter((s) => !s.archived);

  const initial = {
    date,
    hours: hours ? String(hours) : "",
    note,
    lines: entries.map<DayLine>((e) => ({
      sourceId: e.sourceId,
      amount: String(e.amount),
      note: e.note,
    })),
  };

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete this day?",
        description: "Removes the day's hours and all its income lines.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteDay(date);
        toast.success("Day deleted");
      } catch {
        toast.error("Could not delete day");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      {dialog}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">{prettyDate(date)}</span>
          <span className="text-xs text-muted-foreground">{fmtHours(hours)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">{fmtMoney(dayAmount)}</span>
          <DayDialog
            active={active}
            allSources={sources}
            today={today}
            initial={initial}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Edit day">
                <PencilIcon />
              </Button>
            }
          />
          <Button variant="ghost" size="icon-sm" onClick={handleDelete} disabled={pending} aria-label="Delete day">
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-col gap-0.5 pl-1">
          {entries.map((e) => {
            const s = byId.get(e.sourceId);
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s?.color ?? "#999" }} aria-hidden />
                <span className="flex-1 truncate">{s?.name ?? "Unknown"}{e.note ? ` — ${e.note}` : ""}</span>
                <span>{fmtMoney(e.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
      {note && <p className="pl-1 text-xs text-muted-foreground italic">{note}</p>}
    </div>
  );
}
```

Remove the now-unused imports (`CopyIcon`, `Table*`, `Select*`, `Dialog*` if no longer used) — run the typecheck in the next step and delete whatever it flags as unused.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "PeriodCard|WorkBoard" || echo "work UI OK"`
Expected: `work UI OK` (fix any unused-import errors it reports).

- [ ] **Step 7: Commit**

```bash
git add src/components/work/PeriodCard.tsx
git commit -m "feat(work): group period by day with edit/delete + holiday chip"
```

---

## Task 9: Stats page + SourceTable

**Files:**
- Modify: `src/components/stats/SourceTable.tsx`
- Modify: `src/app/admin/stats/page.tsx`

- [ ] **Step 1: Drop hours from `SourceRow` and the table**

In `src/components/stats/SourceTable.tsx`:
  - Change the type: `export type SourceRow = { name: string; color: string; amount: number; daysWorked: number };`
  - Remove the `fmtHours` import if unused after edits.
  - Remove the `Hours` and `$/h` `<TableHead>`s and their `<TableCell>`s (both in the body row and the footer).
  - Simplify `totals` to `{ amount, days }` and drop `totalPerHour`.

Resulting body row cells: Source, Earned, Days. Footer: Total, Earned sum, Days sum.

- [ ] **Step 2: Load `work_days` and derive hours from it in `src/app/admin/stats/page.tsx`**

  a. Add `workDays` to the schema import.

  b. Add `allDays` to the `Promise.all` (after `allEntries`):

```tsx
    db.select().from(workDays).orderBy(asc(workDays.date), asc(workDays.id)),
```

  Update the destructuring to `const [sources, allEntries, allDays, markers, allGoals, allChecks] = ...`.

  c. Add a filtered days set mirroring the entries filter (after the `entries` filter, ~line 82):

```tsx
  const days = allDays.filter((d) => {
    if (from && d.date < from) return false;
    if (to && d.date > to) return false;
    return true;
  });
```

  d. `byMonth` hours: change the month bucketing to sum HOURS from `days` and AMOUNT from `entries`. Replace the `monthMap` loop (lines 88-95):

```tsx
  const monthMap = new Map<string, { hours: number; amount: number }>();
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const m = monthMap.get(month) ?? { hours: 0, amount: 0 };
    m.hours += d.hours;
    monthMap.set(month, m);
  }
  for (const e of entries) {
    const month = e.date.slice(0, 7);
    const m = monthMap.get(month) ?? { hours: 0, amount: 0 };
    m.amount += e.amount;
    monthMap.set(month, m);
  }
```

  e. Per-source table rows: drop hours. Replace the `perSourceAgg` block (lines 154-183) with:

```tsx
  const perSourceAgg = new Map<number, { amount: number; days: Set<string> }>();
  for (const e of entries) {
    const agg = perSourceAgg.get(e.sourceId) ?? { amount: 0, days: new Set<string>() };
    agg.amount += e.amount;
    agg.days.add(e.date);
    perSourceAgg.set(e.sourceId, agg);
  }
  const sourceRows: SourceRow[] = visibleSources
    .map((s) => {
      const agg = perSourceAgg.get(s.id);
      return {
        name: s.name,
        color: s.color,
        amount: round2(agg?.amount ?? 0),
        daysWorked: agg?.days.size ?? 0,
      };
    })
    .filter((r) => r.amount > 0 || r.daysWorked > 0)
    .sort((a, b) => b.amount - a.amount);
```

  f. Heatmap `byDayHours`: sum from ALL days, not entries. Replace lines 186-191:

```tsx
  const rangeStart = addDays(today, -(53 * 7 - 1));
  const byDayHours: Record<string, number> = {};
  for (const d of allDays) {
    if (d.date < rangeStart || d.date > today) continue;
    byDayHours[d.date] = (byDayHours[d.date] ?? 0) + d.hours;
  }
```

  g. Headline `totalHours` from days. Replace lines 194-199:

```tsx
  let totalAmount = 0;
  for (const e of entries) totalAmount += e.amount;
  let totalHours = 0;
  for (const d of days) totalHours += d.hours;
```

  h. Open period build: pass both collections:

```tsx
  const periods = buildPeriods(allDays, allEntries, markers);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "stats" || echo "stats OK"`
Expected: `stats OK`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/stats/page.tsx src/components/stats/SourceTable.tsx
git commit -m "feat(stats): hours from work_days; per-source table earnings-only"
```

---

## Task 10: Dashboard quick-add + CSV export + seed

**Files:**
- Modify: `src/components/dashboard/QuickAddWork.tsx`
- Modify: `src/app/api/export/work.csv/route.ts`
- Modify: `scripts/seed.ts`

- [ ] **Step 1: Point QuickAddWork at `quickAddToday`**

In `src/components/dashboard/QuickAddWork.tsx`:
  - Change import: `import { quickAddToday } from "@/actions/work";`
  - Remove the `import { todayStr } ...` line (no longer needed).
  - In `handleAdd`, replace the `await createEntry({ date: todayStr(), sourceId, hours: h, amount: a, note: note.trim() });` call with:

```ts
        await quickAddToday({ sourceId, hours: h, amount: a, note: note.trim() });
```

  All the field UI and validation stay as-is.

- [ ] **Step 2: Rewrite the CSV export for the new shape**

In `src/app/api/export/work.csv/route.ts`:
  - Import `workDays`: `import { incomeSources, workEntries, workDays } from "@/db/schema";`
  - Load all three tables; build a `hoursByDate` map from `work_days`. Replace the `Promise.all` + row-building block:

```ts
  const [sources, entries, days] = await Promise.all([
    db.select().from(incomeSources),
    db.select().from(workEntries).orderBy(asc(workEntries.date), asc(workEntries.id)),
    db.select().from(workDays).orderBy(asc(workDays.date)),
  ]);

  const nameById = new Map(sources.map((s) => [s.id, s.name]));
  const hoursByDate = new Map(days.map((d) => [d.date, d.hours]));
  const entryDates = new Set(entries.map((e) => e.date));

  // One row per income line (with that day's hours), PLUS a row for any day that
  // has hours but no income line so hours-only days still export.
  const rows = [["date", "hours", "source", "amount", "note"]];
  for (const e of entries) {
    rows.push([
      e.date,
      String(hoursByDate.get(e.date) ?? 0),
      nameById.get(e.sourceId) ?? "",
      String(e.amount),
      e.note,
    ]);
  }
  for (const d of days) {
    if (!entryDates.has(d.date)) {
      rows.push([d.date, String(d.hours), "", "", d.note]);
    }
  }
  rows.splice(1, 0, ...rows.splice(1).sort((a, b) => a[0].localeCompare(b[0])));
```

  Keep the `csvField` helper and the `Response` return unchanged.

- [ ] **Step 3: Seed `work_days` + income lines in `scripts/seed.ts`**

In `scripts/seed.ts`:
  - Import `workDays`.
  - The generator currently pushes per-source rows with `hours`. Change it so hours accumulate PER DAY and income lines carry only amounts. Replace the entry types + loop (lines 54-100) with:

```ts
  const dayHours = new Map<string, number>(); // date -> total hours
  const entries: { date: string; sourceId: number; amount: number; note: string }[] = [];

  const clientNotes = ["Feature work", "Bug fixes", "Meetings + review", "Refactor"];
  const streamNotes = ["Evening stream", "Cooking stream", "Q&A stream", "Collab"];

  let dayOffset = 0;
  while (entries.length < 40 && dayOffset < 92) {
    const date = addDays(today, -dayOffset);
    dayOffset += 1;
    if (rand() < 0.4) continue;

    let hoursToday = 0;
    if (rand() < 0.65) {
      const hours = Math.round((3 + rand() * 5) * 2) / 2;
      const rate = 45 + Math.round(rand() * 25);
      hoursToday += hours;
      entries.push({ date, sourceId: clientA.id, amount: Math.round(hours * rate), note: pick(clientNotes) });
    }
    if (rand() < 0.5) {
      const hours = Math.round((1.5 + rand() * 3) * 2) / 2;
      hoursToday += hours;
      entries.push({ date, sourceId: streaming.id, amount: Math.round(20 + rand() * 180), note: pick(streamNotes) });
    }
    if (hoursToday > 0) dayHours.set(date, (dayHours.get(date) ?? 0) + hoursToday);
  }

  if (dayHours.size > 0) {
    await db.insert(workDays).values([...dayHours].map(([date, hours]) => ({ date, hours, note: "" })));
  }
  await db.insert(workEntries).values(entries);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "QuickAddWork|work.csv|seed" || echo "task10 OK"`
Expected: `task10 OK`.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/QuickAddWork.tsx src/app/api/export/work.csv/route.ts scripts/seed.ts
git commit -m "feat(work): dashboard quick-add, CSV export, seed for per-day hours"
```

---

## Task 11: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + lint + tests**

Run: `npm run test && npx tsc --noEmit && npm run lint`
Expected: tests PASS, `tsc` prints nothing (exit 0), lint clean. Fix anything that fails.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Manual smoke test (dev)**

```bash
npm run dev
```
Then in the browser (log in first):
  - `/admin/work`: click **Log a day** → pick today, enter `6` hours, **Add income** → Source 1 `$30`, **Add income** → Source 2 `$20`, Save. Confirm the open period shows `6h`, `$50`, `$8.33/h`, and one day row with two income lines.
  - Edit that day (pencil) → change hours to `7`, remove one line, Save → totals update.
  - Close the period, then confirm the closed card shows an **“N off”** holiday chip.
  - `/admin` dashboard quick-add: add an entry for today → appears on `/admin/work`.
  - `/admin/stats`: headline hours, monthly chart, heatmap, and the by-source table (no Hours column) all render.
  - `/api/export/work.csv`: downloads with header `date,hours,source,amount,note`.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address verification findings for per-day hours"
```

---

## Self-review notes (already reconciled)

- **Spec coverage:** work_days + slim work_entries (Task 1, migration Task 4); day editor with editable past days (Tasks 7, 8); one-line-per-source enforced in `saveDay` + dialog (Tasks 3, 7); hours-only days allowed (Task 3 validation, periods test Task 2); holiday days full-period span with first-period fallback (Task 2); migration sums hours + dedups amounts (Task 4); achievements/stats/dashboard/CSV/seed consumers (Tasks 6, 9, 10).
- **Type consistency:** `WorkDayLite`/`WorkEntryLite` (no hours) used everywhere; `PeriodTotals.bySource` is `{ amount }` only; `SourceRow` drops hours; `EarnInput` gains `days`; `saveDay`/`deleteDay`/`quickAddToday` signatures match all call sites.
- **No placeholders:** every code step contains full code; unused-import cleanup is explicit (Task 8 Step 5).
