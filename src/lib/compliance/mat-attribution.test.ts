import { describe, it, expect } from "vitest";
import { splitNightsAcrossPeriods, prorateRevenueAcrossPeriods } from "./mat-attribution";
import type { PeriodRange } from "./mat-attribution";

const q4_2025: PeriodRange = { start: new Date("2025-10-01"), end: new Date("2025-12-31") };
const q1_2026: PeriodRange = { start: new Date("2026-01-01"), end: new Date("2026-03-31") };

describe("splitNightsAcrossPeriods", () => {
  it("splits the Dec 29 – Jan 4 stay 3/3 across the Q4/Q1 boundary", () => {
    const split = splitNightsAcrossPeriods(new Date("2025-12-29"), new Date("2026-01-04"), [
      q4_2025,
      q1_2026,
    ]);
    expect(split.nightsPerPeriod).toEqual([3, 3]);
    expect(split.unattributedNights).toBe(0);
    expect(split.totalNights).toBe(6);
  });

  it("attributes a wholly-inside-one-period stay entirely to that period", () => {
    const split = splitNightsAcrossPeriods(new Date("2026-01-10"), new Date("2026-01-13"), [
      q4_2025,
      q1_2026,
    ]);
    expect(split.nightsPerPeriod).toEqual([0, 3]);
  });

  it("flags nights outside any provided period as unattributed rather than dropping them", () => {
    const split = splitNightsAcrossPeriods(new Date("2026-06-01"), new Date("2026-06-03"), [
      q4_2025,
      q1_2026,
    ]);
    expect(split.unattributedNights).toBe(2);
  });
});

describe("prorateRevenueAcrossPeriods", () => {
  it("splits $1,380.00 evenly 3/3 nights into $690.00 / $690.00, no cent drift", () => {
    const { amountPerPeriodCents, crossesBoundary } = prorateRevenueAcrossPeriods(
      new Date("2025-12-29"),
      new Date("2026-01-04"),
      138000,
      [q4_2025, q1_2026]
    );
    expect(amountPerPeriodCents).toEqual([69000, 69000]);
    expect(amountPerPeriodCents[0] + amountPerPeriodCents[1]).toBe(138000);
    expect(crossesBoundary).toBe(true);
  });

  it("does not mark a single-period booking as crossing a boundary", () => {
    const { crossesBoundary, amountPerPeriodCents } = prorateRevenueAcrossPeriods(
      new Date("2026-01-10"),
      new Date("2026-01-13"),
      30000,
      [q4_2025, q1_2026]
    );
    expect(crossesBoundary).toBe(false);
    expect(amountPerPeriodCents).toEqual([0, 30000]);
  });

  it("handles an uneven split without losing or duplicating a cent (7 nights, $1000 -> odd division)", () => {
    // 2 nights in period A, 5 nights in period B, $1000.00 = 100000 cents.
    // 100000 * 2/7 = 28571.43 -> 28571; 100000 * 5/7 = 71428.57 -> 71429 (largest remainder)
    const stay = { checkIn: new Date("2025-12-30"), checkOut: new Date("2026-01-06") }; // 7 nights, 2 in Dec, 5 in Jan
    const { amountPerPeriodCents } = prorateRevenueAcrossPeriods(
      stay.checkIn,
      stay.checkOut,
      100000,
      [q4_2025, q1_2026]
    );
    expect(amountPerPeriodCents[0] + amountPerPeriodCents[1]).toBe(100000);
    expect(amountPerPeriodCents).toEqual([28571, 71429]);
  });
});
