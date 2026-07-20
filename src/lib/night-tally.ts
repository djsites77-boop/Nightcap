import { prisma } from "@/lib/db";
import { unionNightsByCalendarYear } from "@/lib/compliance/night-attribution";
import { resolveNightCapForYear, type ComplianceRuleRow } from "@/lib/compliance/rules";

/**
 * Recomputes NightTally for a property from its current non-cancelled
 * bookings, attributing nights per-night to the calendar year they actually
 * fall in (spec §6a) — never the whole booking to its check-in year. Call
 * this after any booking is created, cancelled, or its dates change.
 *
 * Nights are counted as the *union* of night-dates across all bookings, not
 * summed booking-by-booking: a property listed on more than one platform can
 * have the same real stay reported by more than one connected calendar (see
 * unionNightsByCalendarYear), and a plain sum would double-count that night
 * against the cap.
 */
export async function recomputeNightTally(propertyId: string): Promise<void> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: { unitType: true, municipalityId: true },
  });

  const bookings = await prisma.booking.findMany({
    where: { propertyId, cancelledAt: null },
    select: { checkIn: true, checkOut: true },
  });

  const nightsByYear = unionNightsByCalendarYear(bookings);

  if (property.unitType !== "entire_home") {
    // No annual cap tier for partial-unit properties (spec §6) — nothing to tally.
    return;
  }

  const rules = await prisma.complianceRule.findMany({
    where: { municipalityId: property.municipalityId, ruleType: "night_cap" },
    select: { ruleType: true, unitType: true, value: true, effectiveDate: true },
  });
  const ruleRows: ComplianceRuleRow[] = rules.map((r) => ({
    ruleType: r.ruleType,
    unitType: r.unitType,
    value: r.value,
    effectiveDate: r.effectiveDate,
  }));

  // Recompute every year that has at least one night, plus the current year
  // (so a brand-new property with no bookings yet still gets a 0/cap row).
  const currentYear = new Date().getUTCFullYear();
  const years = new Set([...nightsByYear.keys(), currentYear]);

  for (const year of years) {
    const cap = resolveNightCapForYear(ruleRows, "entire_home", year);
    if (cap === null) continue; // no rule effective yet for that year — nothing to store

    await prisma.nightTally.upsert({
      where: { propertyId_calendarYear: { propertyId, calendarYear: year } },
      create: {
        propertyId,
        calendarYear: year,
        nightsUsed: nightsByYear.get(year) ?? 0,
        cap,
      },
      update: {
        nightsUsed: nightsByYear.get(year) ?? 0,
        cap,
        lastComputedAt: new Date(),
      },
    });
  }
}
