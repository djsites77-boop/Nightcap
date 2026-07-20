import { nightDates } from "./night-attribution";
import { allocateProportional } from "./allocate";

export interface PeriodRange {
  /** Inclusive start day (UTC midnight). */
  start: Date;
  /** Inclusive end day (UTC midnight) — the period's last night. */
  end: Date;
}

export interface PeriodSplit {
  /** Nights attributed to each entry of the input `periods` array, by index. */
  nightsPerPeriod: number[];
  /** Nights that fell outside every provided period — should be ~0 in practice;
   * a non-zero value means the caller's period list has a gap and needs a
   * MatPeriod created to cover it. */
  unattributedNights: number;
  totalNights: number;
}

export function splitNightsAcrossPeriods(
  checkIn: Date,
  checkOut: Date,
  periods: PeriodRange[]
): PeriodSplit {
  const nights = nightDates(checkIn, checkOut);
  const nightsPerPeriod = periods.map(() => 0);
  let unattributedNights = 0;

  for (const night of nights) {
    const idx = periods.findIndex(
      (p) => night.getTime() >= p.start.getTime() && night.getTime() <= p.end.getTime()
    );
    if (idx === -1) unattributedNights++;
    else nightsPerPeriod[idx]++;
  }

  return { nightsPerPeriod, unattributedNights, totalNights: nights.length };
}

/**
 * Prorate a booking's gross revenue (in cents) across the MAT periods its
 * stay overlaps, by nights-in-period share of total nights (spec §6a/§7).
 * Uses largest-remainder allocation so the shares sum to exactly
 * `grossAmountCents` — no silent cent drift on a tax ledger.
 *
 * Per spec's open question #5: this always prorates linearly by night. A
 * booking whose price isn't actually uniform per night (e.g. a lump-sum
 * cleaning fee) isn't detectable from the data Nitecap has (a single
 * gross_amount per booking) — callers should flag any booking that crosses a
 * period boundary for the host to review, rather than trusting the linear
 * split silently.
 */
export function prorateRevenueAcrossPeriods(
  checkIn: Date,
  checkOut: Date,
  grossAmountCents: number,
  periods: PeriodRange[]
): { amountPerPeriodCents: number[]; crossesBoundary: boolean } {
  const { nightsPerPeriod, totalNights } = splitNightsAcrossPeriods(checkIn, checkOut, periods);
  const amountPerPeriodCents = allocateProportional(grossAmountCents, nightsPerPeriod);
  const periodsWithNights = nightsPerPeriod.filter((n) => n > 0).length;
  return { amountPerPeriodCents, crossesBoundary: periodsWithNights > 1 && totalNights > 0 };
}
