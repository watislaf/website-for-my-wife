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
    expect(open.totals.perHour).toBe(8.33);
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
