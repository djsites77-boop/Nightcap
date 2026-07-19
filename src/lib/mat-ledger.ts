import "server-only";
import { prisma } from "@/lib/db";
import {
  resolveMatRate,
  type ComplianceRuleRow,
} from "@/lib/compliance/rules";
import { prorateRevenueAcrossPeriods } from "@/lib/compliance/mat-attribution";

/** Inclusive UTC quarter bounds: Q1=Jan–Mar, … Q4=Oct–Dec. */
export function quarterBounds(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  const periodStart = new Date(Date.UTC(year, startMonth, 1));
  // Inclusive last calendar day of the quarter
  const periodEnd = new Date(Date.UTC(year, startMonth + 3, 0));
  return { periodStart, periodEnd };
}

function toRuleRows(
  rules: Array<{ ruleType: string; unitType: string; value: unknown; effectiveDate: Date }>
): ComplianceRuleRow[] {
  return rules.map((r) => ({
    ruleType: r.ruleType,
    unitType: r.unitType as ComplianceRuleRow["unitType"],
    value: r.value,
    effectiveDate: r.effectiveDate,
  }));
}

/**
 * Ensure quarterly MatPeriod rows exist for a property/year, with rateApplied
 * frozen at each period's start date (spec §7).
 */
export async function ensureMatPeriods(propertyId: string, year: number) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: { municipalityId: true, unitType: true },
  });
  const rules = await prisma.complianceRule.findMany({
    where: { municipalityId: property.municipalityId, ruleType: "mat_rate" },
  });
  const ruleRows = toRuleRows(rules);

  for (const q of [1, 2, 3, 4] as const) {
    const { periodStart, periodEnd } = quarterBounds(year, q);
    const rate = resolveMatRate(ruleRows, property.unitType, periodStart);
    if (rate == null) continue;

    await prisma.matPeriod.upsert({
      where: {
        propertyId_periodStart_periodEnd: {
          propertyId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        propertyId,
        periodStart,
        periodEnd,
        grossRevenue: 0,
        rateApplied: rate,
        amountOwed: 0,
        status: "due",
      },
      update: {},
    });
  }
}

/**
 * Recompute due MatPeriod gross/owed from bookings using per-night proration
 * (§6a/§7). Remitted periods are left untouched so historical remittances stay stable.
 */
export async function recomputeMatLedger(propertyId: string, year: number) {
  await ensureMatPeriods(propertyId, year);

  const periods = await prisma.matPeriod.findMany({
    where: {
      propertyId,
      periodStart: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
    orderBy: { periodStart: "asc" },
  });

  if (periods.length === 0) return { boundaryCrossingBookingIds: [] as string[] };

  const bookings = await prisma.booking.findMany({
    where: {
      propertyId,
      cancelledAt: null,
      grossAmount: { not: null },
      checkIn: { lt: new Date(Date.UTC(year + 1, 0, 1)) },
      checkOut: { gt: new Date(Date.UTC(year, 0, 1)) },
    },
  });

  const periodRanges = periods.map((p) => ({ start: p.periodStart, end: p.periodEnd }));
  const grossByPeriod = new Map(periods.map((p) => [p.id, 0]));
  const boundaryCrossingBookingIds: string[] = [];

  for (const booking of bookings) {
    const cents = Math.round(Number(booking.grossAmount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) continue;

    const { amountPerPeriodCents, crossesBoundary } = prorateRevenueAcrossPeriods(
      booking.checkIn,
      booking.checkOut,
      cents,
      periodRanges
    );
    if (crossesBoundary) boundaryCrossingBookingIds.push(booking.id);

    periods.forEach((period, idx) => {
      if (period.status === "remitted") return;
      grossByPeriod.set(period.id, (grossByPeriod.get(period.id) ?? 0) + amountPerPeriodCents[idx]);
    });
  }

  for (const period of periods) {
    if (period.status === "remitted") continue;
    const grossCents = grossByPeriod.get(period.id) ?? 0;
    const gross = grossCents / 100;
    const rate = Number(period.rateApplied);
    const amountOwed = Math.round(gross * rate * 100) / 100;
    await prisma.matPeriod.update({
      where: { id: period.id },
      data: {
        grossRevenue: Math.round(gross * 100) / 100,
        amountOwed,
      },
    });
  }

  return { boundaryCrossingBookingIds };
}

/**
 * After an admin edits a municipality's mat_rate rule (/admin/tax-rates),
 * re-freeze rateApplied on every *due* period of that municipality's
 * properties and recompute amountOwed. Remitted periods are never touched —
 * the rate actually remitted stays on the historical record.
 */
export async function refreshDueMatRates(municipalityId: string) {
  const rules = await prisma.complianceRule.findMany({
    where: { municipalityId, ruleType: "mat_rate" },
  });
  const ruleRows = toRuleRows(rules);

  const properties = await prisma.property.findMany({
    where: { municipalityId, archivedAt: null },
    select: { id: true, unitType: true },
  });

  for (const property of properties) {
    const duePeriods = await prisma.matPeriod.findMany({
      where: { propertyId: property.id, status: "due" },
    });
    for (const period of duePeriods) {
      const rate = resolveMatRate(ruleRows, property.unitType, period.periodStart);
      if (rate == null) continue;
      const gross = Number(period.grossRevenue);
      await prisma.matPeriod.update({
        where: { id: period.id },
        data: {
          rateApplied: rate,
          amountOwed: Math.round(gross * rate * 100) / 100,
        },
      });
    }
  }
}

/** Ensure + recompute current and adjacent years touched by a booking span. */
export async function recomputeMatForBookingSpan(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
) {
  const years = new Set<number>();
  years.add(checkIn.getUTCFullYear());
  years.add(new Date(checkOut.getTime() - 1).getUTCFullYear());
  years.add(new Date().getUTCFullYear());
  for (const year of years) {
    await recomputeMatLedger(propertyId, year);
  }
}
