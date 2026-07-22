import "server-only";
import { prisma } from "@/lib/db";
import { computeComplianceStatus, daysBetween, type ComplianceStatus } from "@/lib/compliance/status";
import { resolvePartialUnitBedroomCap, type ComplianceRuleRow } from "@/lib/compliance/rules";

export interface PropertyStatusView {
  status: ComplianceStatus;
  nightsUsed: number | null;
  cap: number | null;
  daysToRenewal: number | null;
  bedroomCap: number | null;
  matDueCents: number;
}

/** Shared status computation used by both the dashboard grid and property detail. */
export async function getPropertyStatusView(propertyId: string): Promise<PropertyStatusView> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      nightTallies: { where: { calendarYear: new Date().getUTCFullYear() } },
      matPeriods: { where: { status: "due" } },
      inspectionItems: true,
      rentalUnits: true,
    },
  });

  const daysToRenewal = property.registrationExpiryDate
    ? daysBetween(new Date(), property.registrationExpiryDate)
    : null;

  const tally = property.nightTallies[0];
  const matDueCents = property.matPeriods.reduce(
    (sum, p) => sum + Math.round(Number(p.amountOwed) * 100),
    0
  );

  let bedroomCap: number | null = null;
  if (property.unitType === "partial_unit") {
    const rules = await prisma.complianceRule.findMany({
      where: { municipalityId: property.municipalityId, ruleType: "partial_unit_bedroom_cap" },
      select: { ruleType: true, unitType: true, value: true, effectiveDate: true },
    });
    const ruleRows: ComplianceRuleRow[] = rules.map((r) => ({
      ruleType: r.ruleType,
      unitType: r.unitType,
      value: r.value,
      effectiveDate: r.effectiveDate,
    }));
    bedroomCap = resolvePartialUnitBedroomCap(ruleRows, property.bedroomCount, new Date());
  }

  const status = computeComplianceStatus({
    unitType: property.unitType,
    nightsUsed: tally?.nightsUsed ?? 0,
    cap: tally?.cap ?? null,
    daysToRenewal,
    inspectionItems: property.inspectionItems.map((i) => ({
      completed: i.completed,
      required: i.required,
      dueDate: i.dueDate,
    })),
  });

  return {
    status,
    nightsUsed: tally?.nightsUsed ?? null,
    cap: tally?.cap ?? null,
    daysToRenewal,
    bedroomCap,
    matDueCents,
  };
}
