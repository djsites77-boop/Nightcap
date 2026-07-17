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
