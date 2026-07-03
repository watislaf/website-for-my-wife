# Per-day hours + holiday days — design

**Date:** 2026-07-03
**Area:** `/admin/work` work log

## Problem

Today hours are stored **per income source**: each `work_entries` row ties
`hours` **and** `amount` to one source on a date. There's no notion of a day's
total hours. Logging a day worked across two income sources forces either a fake
hours split or double-counting (`periods.ts` sums `e.hours` across all entries),
which also corrupts the `$/h` stat.

The desired model: **hours belong to the day**; each day has zero or more
**income lines** (one per source), each carrying only an amount. Example: one
day = `6h`, Source 1 `$30`, Source 2 `$20`.

Additionally: a **finished period** should report how many **holiday / off days**
it contained.

## Requirements

1. Hours are a single value **per day**, independent of income.
2. Each day has 0+ income lines; **at most one line per source per day**.
3. A day may have **hours with no income** (unpaid / not-yet-paid work). Income
   with 0 hours is also allowed.
4. **Past days are editable** — any day can be reopened and changed.
5. Existing logged data is **migrated** by collapsing each day's per-source hours
   into a single day-hours value (sum); amounts are preserved as income lines.
6. Finished (closed) periods show a **holiday-days** count.

## Data model (Approach A — two tables)

- **`work_days`** — new table:
  `{ id, date TEXT UNIQUE NOT NULL, hours REAL NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT "" }`.
  One row per day = that day's total hours.
- **`work_entries`** — slimmed to
  `{ id, date, sourceId, amount REAL, note }` with a **unique `(date, sourceId)`**.
  The `hours` column is **dropped**. Pure income lines.

The `sourceId → income_sources` FK and the archive/delete-guard behaviour are
unchanged.

### Migration

For each distinct `date` in existing `work_entries`:
- insert a `work_days` row with `hours = Σ` that day's entry hours (and empty note).

Then drop the `hours` column from `work_entries`. Amounts, sources, notes, and
dates on the income rows are untouched. If two pre-existing rows share
`(date, sourceId)` (possible under the old model), collapse them by summing
amounts so the new unique constraint holds; note the merge is lossy on per-row
notes (keep the first non-empty note).

Migration runs via the project's existing migration mechanism (Drizzle). The
step lives alongside current DB setup — confirm the exact runner during
implementation.

## UI / interaction

### Log / edit a day (single shared dialog)

Used for both adding a new day and editing a past one.

- **Date** picker.
- **Hours** — one numeric field (step 0.5, ≥ 0) for the day total.
- **Income lines** — repeatable rows `{ source, amount, note }`:
  - "Add income" button appends a line.
  - The source dropdown **omits sources already used** on that day (enforces
    one-per-source).
  - Each line has a remove button.
- **Note** — optional day-level note (on `work_days`).
- **Save** semantics: upsert `work_days(date)`, upsert each income line by
  `(date, sourceId)`, and delete income lines removed in the dialog. Editing a
  past day pre-fills all fields from stored data.
- **Validation:** a day is valid if `hours > 0` **or** it has ≥ 1 income line.
  Amounts must be finite; hours non-negative.

### Period card — grouped by day

Replace the flat per-entry table with a per-**day** grouping. Each day shows:

- `date · hours`
- its income lines (colored source dot + source name + amount)
- a day `$` subtotal
- **Edit** (opens the day dialog) and **Delete** (removes the `work_days` row and
  all that day's income lines).

The per-source aggregate list and the stat chips stay, adjusted for the new
totals below.

## Totals (`src/lib/periods.ts`)

`buildPeriods` / `totals` change to consume **both** `work_days` and
`work_entries`, bucketed into periods by `date` using the existing marker logic
(`(prevMarker.endDate, marker.endDate]`).

- `hours` = Σ `work_days.hours` in the period.
- `amount` = Σ `work_entries.amount` in the period.
- `perHour` = `amount / hours` (0 when hours = 0), rounded as today.
- `daysWorked` = count of `work_days` in the period with `hours > 0`.
- `bySource` = amounts summed per source. **No per-source hours** anymore — the
  `bySource` shape drops `hours` and keeps `{ amount }`.
- **`holidayDays`** (closed periods only): calendar days across the period span
  minus `daysWorked`.
  - Span = `(prevMarker.endDate, marker.endDate]` — i.e. day after the previous
    marker through this marker's end date, inclusive.
  - **First-ever period** (no previous marker): span starts at that period's
    first logged day (there is no earlier boundary).
  - A day logged with `hours = 0` counts as a holiday (it is not a worked day).
  - The open/current period has no `holidayDays` (undefined); shown only on
    closed cards as a new chip.

## Touchpoints

- **`src/db/schema.ts`** — add `work_days`; edit `work_entries` (drop `hours`,
  add unique `(date, sourceId)`).
- **`src/actions/work.ts`** — add `upsertWorkDay(date, { hours, note })`,
  `deleteWorkDay(date)` (cascades income lines for that day), and a combined
  save action for the day dialog. Adjust entry actions to drop `hours` and
  enforce `(date, sourceId)` uniqueness on upsert. Keep the source
  archive/delete guards.
- **`src/components/work/WorkBoard.tsx`** — replace `QuickAddForm` with the
  day dialog trigger; keep sources manager, filter bar, lifetime strip
  (lifetime totals recomputed from the new model).
- **`src/components/work/PeriodCard.tsx`** — regroup by day; day edit/delete;
  holiday-days chip on closed periods.
- **`src/app/api/export/work.csv/route.ts`** — emit the new shape: per-day
  hours plus per-source amounts (columns: date, hours, day note, then income
  lines — final column layout decided in implementation).
- **`src/lib/achievements/engine.ts`** — its `input.entries` currently supplies
  per-entry `hours`. Re-point `totalHours`, `distinctDays`/`total_days_worked`,
  and the `buildPeriods` call at `work_days`. Existing metrics
  (`total_hours`, `total_days_worked`, `period_hours`, `big-payday`, source
  earnings) keep their meaning under the new sources of truth.
- **`src/lib/periods.ts`** — signature + totals changes above.

## Testing

- **Migration:** a pre-existing multi-source day collapses to summed day-hours;
  amounts preserved; duplicate `(date, sourceId)` merges by summing amounts.
- **Totals:** hours-only day (no income) → hours counted, amount 0, `$/h` = 0
  (not NaN/∞). Income spread across two sources on a `6h` day → hours = 6 (not
  12), amounts summed per source, `$/h` correct.
- **Holiday days:** closed period with unlogged calendar gaps and a 0-hour
  logged day counts both as holidays; a single-day worked period = 0 holidays;
  first-ever period counts from its first logged day.
- **Uniqueness:** saving a second income line for a source already present that
  day updates rather than duplicates.
- **Achievements:** `total_hours` / `total_days_worked` / `period_hours` derive
  from `work_days` and match hand-computed values.
- Existing `periods.test.ts` and `achievements/engine.test.ts` updated to the
  new signatures.

## Out of scope

- Multiple income lines from the same source in one day.
- Per-source hours (removed).
- Any change to goals, plan items, landing/analytics, or subscribers.
