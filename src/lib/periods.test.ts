import { describe, it, expect } from "vitest";
import { buildPeriods, WorkEntryLite, MarkerLite } from "./periods";

const e = (id: number, date: string, sourceId: number, hours: number, amount: number): WorkEntryLite =>
  ({ id, date, sourceId, hours, amount, note: "" });
const m = (id: number, endDate: string): MarkerLite => ({ id, endDate, name: "" });

describe("buildPeriods", () => {
  it("splits entries at marker boundaries (inclusive end)", () => {
    const periods = buildPeriods(
      [e(1, "2026-06-01", 1, 4, 100), e(2, "2026-06-15", 1, 2, 50), e(3, "2026-06-16", 2, 8, 200)],
      [m(1, "2026-06-15")],
    );
    expect(periods).toHaveLength(2);           // open first, then closed
    expect(periods[0].marker).toBeNull();
    expect(periods[0].entries.map(x => x.id)).toEqual([3]);
    expect(periods[1].entries.map(x => x.id)).toEqual([1, 2]);
    expect(periods[1].totals).toMatchObject({ hours: 6, amount: 150, daysWorked: 2, perHour: 25 });
    expect(periods[1].totals.bySource[1]).toEqual({ hours: 6, amount: 150 });
  });

  it("counts distinct dates as daysWorked", () => {
    const [open] = buildPeriods([e(1, "2026-06-01", 1, 2, 10), e(2, "2026-06-01", 2, 3, 20)], []);
    expect(open.totals.daysWorked).toBe(1);
    expect(open.totals.hours).toBe(5);
  });

  it("recalculates when a marker moves", () => {
    const entries = [e(1, "2026-06-10", 1, 1, 10), e(2, "2026-06-20", 1, 1, 10)];
    const before = buildPeriods(entries, [m(1, "2026-06-15")]);
    expect(before[1].entries).toHaveLength(1);
    const after = buildPeriods(entries, [m(1, "2026-06-25")]);   // marker moved later
    expect(after[1].entries).toHaveLength(2);
    expect(after[0].entries).toHaveLength(0);                    // open period now empty
  });

  it("handles multiple markers and unsorted input", () => {
    const periods = buildPeriods(
      [e(3, "2026-03-01", 1, 1, 1), e(1, "2026-01-01", 1, 1, 1), e(2, "2026-02-01", 1, 1, 1)],
      [m(2, "2026-02-15"), m(1, "2026-01-15")],
    );
    expect(periods.map(p => p.entries.length)).toEqual([1, 1, 1]); // open, feb, jan
    expect(periods[2].startDate).toBe("2026-01-01");
    expect(periods[2].endDate).toBe("2026-01-15");
  });

  it("perHour is 0 when no hours", () => {
    const [open] = buildPeriods([e(1, "2026-06-01", 1, 0, 100)], []);
    expect(open.totals.perHour).toBe(0);
  });
});
