/**
 * Per-night attribution (spec §6a). A booking's nights must be attributed
 * night-by-night to whichever calendar year (or MAT period) each night falls
 * in — never the whole stay to the check-in year, which silently mis-tallies
 * bookings that cross Dec 31/Jan 1 (or a MAT quarter boundary).
 *
 * A "night" is identified by the UTC calendar date it starts on: a stay from
 * Dec 29 to Jan 4 contributes the nights of Dec 29, 30, 31 (year A) and
 * Jan 1, 2, 3 (year B) — 3 and 3, never 6 to either year.
 */

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function nightDates(checkIn: Date, checkOut: Date): Date[] {
  const start = utcMidnight(checkIn);
  const end = utcMidnight(checkOut);
  if (end.getTime() <= start.getTime()) {
    throw new Error("checkOut must be after checkIn");
  }
  const nights: Date[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let t = start.getTime(); t < end.getTime(); t += oneDayMs) {
    nights.push(new Date(t));
  }
  return nights;
}

export function nightsByCalendarYear(checkIn: Date, checkOut: Date): Map<number, number> {
  const byYear = new Map<number, number>();
  for (const night of nightDates(checkIn, checkOut)) {
    const year = night.getUTCFullYear();
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }
  return byYear;
}

export interface NightRange {
  checkIn: Date;
  checkOut: Date;
}

/** Whether two stays share at least one night. */
export function rangesOverlap(a: NightRange, b: NightRange): boolean {
  return a.checkIn.getTime() < b.checkOut.getTime() && b.checkIn.getTime() < a.checkOut.getTime();
}

/**
 * Distinct calendar nights across every booking on a property, deduplicated
 * by the actual night rather than summed booking-by-booking.
 *
 * A property listed on more than one platform (Airbnb + VRBO + Booking.com)
 * routinely has the same real stay show up in more than one connected
 * calendar: when a guest books via one platform, the others sync in that
 * date range as blocked, and Nitecap's iCal sync can't distinguish "a real
 * reservation on this platform" from "blocked because it's taken elsewhere"
 * — both parse as an ordinary calendar event. Summing each booking's `nights`
 * independently would count that one real night once per calendar it
 * appears on. Counting the union of night-dates instead means a night is
 * counted once no matter how many connected calendars mention it.
 */
export function unionNightsByCalendarYear(bookings: NightRange[]): Map<number, number> {
  const seenNights = new Set<number>();
  for (const booking of bookings) {
    for (const night of nightDates(booking.checkIn, booking.checkOut)) {
      seenNights.add(night.getTime());
    }
  }
  const byYear = new Map<number, number>();
  for (const t of seenNights) {
    const year = new Date(t).getUTCFullYear();
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }
  return byYear;
}

/**
 * Drops bookings whose entire night range is already covered by an
 * earlier-created booking on the same property (spec: multi-platform
 * listing fix). Used before revenue proration (MAT) — unlike the night cap,
 * which only needs a count, revenue attribution needs one canonical booking
 * per real stay so a duplicate reported by a second connected calendar isn't
 * counted as a second sale. Only a *full* overlap is treated as a duplicate;
 * a partial overlap is left alone for a human to reconcile, since trimming a
 * distinct booking's nights would distort its own price-per-night math.
 */
export function dropFullyOverlappedDuplicates<T extends NightRange & { id: string; createdAt: Date }>(
  bookings: T[]
): T[] {
  const kept: T[] = [];
  const coveredNights = new Set<number>();

  for (const booking of [...bookings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const nights = nightDates(booking.checkIn, booking.checkOut);
    const fullyCovered = nights.every((n) => coveredNights.has(n.getTime()));
    if (fullyCovered) continue;
    nights.forEach((n) => coveredNights.add(n.getTime()));
    kept.push(booking);
  }

  // Preserve original relative order (createdAt sort was only for precedence).
  const keptIds = new Set(kept.map((b) => b.id));
  return bookings.filter((b) => keptIds.has(b.id));
}
