import { describe, it, expect } from "vitest";
import {
  nightDates,
  nightsByCalendarYear,
  unionNightsByCalendarYear,
  dropFullyOverlappedDuplicates,
} from "./night-attribution";

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

describe("unionNightsByCalendarYear — the multi-platform-listing fix", () => {
  it("counts an identical stay reported by two connected calendars as one night, not two", () => {
    const byYear = unionNightsByCalendarYear([
      { checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-06") }, // Airbnb feed
      { checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-06") }, // VRBO's synced block
    ]);
    expect(byYear.get(2026)).toBe(1);
  });

  it("counts a partially-overlapping pair of bookings by their distinct night union", () => {
    const byYear = unionNightsByCalendarYear([
      { checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-08") }, // Jun 5,6,7
      { checkIn: new Date("2026-06-07"), checkOut: new Date("2026-06-09") }, // Jun 7,8 (7 overlaps)
    ]);
    expect(byYear.get(2026)).toBe(4); // Jun 5,6,7,8 — not 5
  });

  it("still sums genuinely separate stays normally", () => {
    const byYear = unionNightsByCalendarYear([
      { checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-03") },
      { checkIn: new Date("2026-02-01"), checkOut: new Date("2026-02-04") },
    ]);
    expect(byYear.get(2026)).toBe(5);
  });
});

describe("dropFullyOverlappedDuplicates — dedupe for MAT revenue", () => {
  it("drops a later-created booking whose nights are fully covered by an earlier one", () => {
    const bookings = [
      { id: "a", checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-06"), createdAt: new Date("2026-06-01") },
      { id: "b", checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-06"), createdAt: new Date("2026-06-02") },
    ];
    const kept = dropFullyOverlappedDuplicates(bookings);
    expect(kept.map((b) => b.id)).toEqual(["a"]);
  });

  it("keeps both bookings when only partially overlapping (left for human review)", () => {
    const bookings = [
      { id: "a", checkIn: new Date("2026-06-05"), checkOut: new Date("2026-06-08"), createdAt: new Date("2026-06-01") },
      { id: "b", checkIn: new Date("2026-06-07"), checkOut: new Date("2026-06-09"), createdAt: new Date("2026-06-02") },
    ];
    const kept = dropFullyOverlappedDuplicates(bookings);
    expect(kept.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps genuinely separate bookings untouched", () => {
    const bookings = [
      { id: "a", checkIn: new Date("2026-01-01"), checkOut: new Date("2026-01-03"), createdAt: new Date("2026-01-01") },
      { id: "b", checkIn: new Date("2026-02-01"), checkOut: new Date("2026-02-04"), createdAt: new Date("2026-01-02") },
    ];
    const kept = dropFullyOverlappedDuplicates(bookings);
    expect(kept.map((b) => b.id).sort()).toEqual(["a", "b"]);
  });
});
