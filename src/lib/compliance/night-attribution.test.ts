import { describe, it, expect } from "vitest";
import { nightDates, nightsByCalendarYear } from "./night-attribution";

describe("nightDates", () => {
  it("counts a same-year 3-night stay as 3 nights", () => {
    const nights = nightDates(new Date("2026-07-24"), new Date("2026-07-27"));
    expect(nights).toHaveLength(3);
  });

  it("throws when checkout is not after checkin", () => {
    expect(() => nightDates(new Date("2026-07-24"), new Date("2026-07-24"))).toThrow();
  });
});

describe("nightsByCalendarYear — the boundary-crossing fix", () => {
  it("splits a Dec 29 – Jan 4 stay 3/3 across years, never 6 to either", () => {
    const byYear = nightsByCalendarYear(new Date("2025-12-29"), new Date("2026-01-04"));
    expect(byYear.get(2025)).toBe(3); // Dec 29, 30, 31
    expect(byYear.get(2026)).toBe(3); // Jan 1, 2, 3
    expect([...byYear.values()].reduce((a, b) => a + b, 0)).toBe(6);
  });

  it("attributes a single-year stay entirely to that year", () => {
    const byYear = nightsByCalendarYear(new Date("2026-03-01"), new Date("2026-03-05"));
    expect(byYear.get(2026)).toBe(4);
    expect(byYear.size).toBe(1);
  });

  it("handles a stay landing exactly on New Year's Eve (1 night)", () => {
    const byYear = nightsByCalendarYear(new Date("2025-12-31"), new Date("2026-01-01"));
    expect(byYear.get(2025)).toBe(1);
    expect(byYear.get(2026)).toBeUndefined();
  });
});
