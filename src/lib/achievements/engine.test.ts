import { describe, it, expect } from "vitest";
import { computeEarned, type EarnInput } from "./engine";

function baseInput(over: Partial<EarnInput> = {}): EarnInput {
  return {
    entries: [],
    markers: [],
    sources: [],
    goals: [],
    goalChecks: [],
    planDoneCount: 0,
    pageviews: [],
    clicksCount: 0,
    distinctTrafficSources: 0,
    subscribersCount: 0,
    currentCoins: 0,
    today: "2026-07-03",
    ...over,
  };
}

const keys = (input: EarnInput) => computeEarned(input).map((e) => e.key);

describe("computeEarned", () => {
  it("crosses a global tier for total_hours (marathoner)", () => {
    // 120 total hours in one entry → marathoner-1 (100) yes, marathoner-2 (500) no.
    const input = baseInput({
      entries: [{ id: 1, date: "2026-07-01", sourceId: 1, hours: 120, amount: 6000, note: "" }],
    });
    const earned = computeEarned(input);
    const k = earned.map((e) => e.key);
    expect(k).toContain("marathoner-1");
    expect(k).not.toContain("marathoner-2");
    // first-dollar milestone (total_entries >= 1) also earned.
    expect(k).toContain("first-dollar");
  });

  it("earns a repeatable per-period achievement once per qualifying period", () => {
    // Two closed periods, each with >= 40 hours (hard-worker-1, scope period).
    const input = baseInput({
      entries: [
        { id: 1, date: "2026-05-10", sourceId: 1, hours: 40, amount: 400, note: "" },
        { id: 2, date: "2026-06-10", sourceId: 1, hours: 45, amount: 450, note: "" },
      ],
      markers: [
        { id: 100, endDate: "2026-05-31", name: "May" },
        { id: 101, endDate: "2026-06-30", name: "June" },
      ],
    });
    const hw = computeEarned(input).filter((e) => e.key === "hard-worker-1");
    expect(hw).toHaveLength(2);
    const instanceKeys = hw.map((e) => e.instanceKey).sort();
    expect(instanceKeys).toEqual(["period:100", "period:101"]);
  });

  it("earns per-source (loyal-client) with a source instanceKey", () => {
    const input = baseInput({
      sources: [{ id: 7 }, { id: 8 }],
      entries: [
        { id: 1, date: "2026-07-01", sourceId: 7, hours: 5, amount: 1200, note: "" },
        { id: 2, date: "2026-07-02", sourceId: 8, hours: 5, amount: 300, note: "" },
      ],
    });
    const loyal = computeEarned(input).filter((e) => e.key === "loyal-client-1");
    // Only source 7 (1200 >= 1000) qualifies; source 8 (300) does not.
    expect(loyal).toHaveLength(1);
    expect(loyal[0].instanceKey).toBe("source:7");
  });

  it("earns perfect_day only when every active goal is checked that day", () => {
    const input = baseInput({
      goals: [
        { id: 1, archived: false },
        { id: 2, archived: false },
        { id: 3, archived: true }, // archived → ignored
      ],
      goalChecks: [
        // 2026-07-01: both active goals checked → perfect
        { goalId: 1, date: "2026-07-01" },
        { goalId: 2, date: "2026-07-01" },
        { goalId: 3, date: "2026-07-01" },
        // 2026-07-02: only goal 1 checked → not perfect
        { goalId: 1, date: "2026-07-02" },
      ],
    });
    const perfect = computeEarned(input).filter((e) => e.key === "perfect-day");
    expect(perfect).toHaveLength(1);
    expect(perfect[0].instanceKey).toBe("day:2026-07-01");
  });

  it("does not earn below threshold", () => {
    // 5 hours total, no goals, nothing else → no work/earnings tiers, no milestones
    // beyond first-dollar (which one entry DOES earn). Assert a real below-threshold miss.
    const input = baseInput({
      entries: [{ id: 1, date: "2026-07-01", sourceId: 1, hours: 5, amount: 50, note: "" }],
    });
    const k = keys(input);
    expect(k).not.toContain("marathoner-1"); // needs 100 total hours
    expect(k).not.toContain("hard-worker-1"); // needs 40h in a period
    expect(k).not.toContain("breadwinner-1"); // needs 1000 earnings
  });

  it("computes best_current_streak across active goals", () => {
    const input = baseInput({
      today: "2026-07-03",
      goals: [{ id: 1, archived: false }],
      goalChecks: [
        { goalId: 1, date: "2026-07-01" },
        { goalId: 1, date: "2026-07-02" },
        { goalId: 1, date: "2026-07-03" },
      ],
    });
    const k = keys(input);
    // streak of 3 → streak-master-1 (threshold 3) earned, streak-master-2 (7) not.
    expect(k).toContain("streak-master-1");
    expect(k).not.toContain("streak-master-2");
  });

  it("emits total_coins based on currentCoins (rich family)", () => {
    const input = baseInput({ currentCoins: 100 });
    const k = keys(input);
    expect(k).toContain("rich-1"); // threshold 100
    expect(k).not.toContain("rich-2"); // threshold 500
  });
});
