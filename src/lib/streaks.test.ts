import { describe, it, expect } from "vitest";
import { currentStreak, bestStreak } from "./streaks";

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-07-02", "2026-07-01", "2026-06-30"], "2026-07-02")).toBe(3);
  });
  it("still counts if today is unchecked but yesterday was (streak alive)", () => {
    expect(currentStreak(["2026-07-01", "2026-06-30"], "2026-07-02")).toBe(2);
  });
  it("is 0 when last check was 2+ days ago", () => {
    expect(currentStreak(["2026-06-30"], "2026-07-02")).toBe(0);
  });
  it("handles empty and duplicates", () => {
    expect(currentStreak([], "2026-07-02")).toBe(0);
    expect(currentStreak(["2026-07-02", "2026-07-02"], "2026-07-02")).toBe(1);
  });
});

describe("bestStreak", () => {
  it("finds the longest run", () => {
    expect(bestStreak(["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"])).toBe(3);
  });
  it("is 0 for empty", () => expect(bestStreak([])).toBe(0));
});
