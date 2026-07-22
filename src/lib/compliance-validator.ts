import { prisma } from "@/lib/db";
import { resolvePartialUnitBedroomCap, type ComplianceRuleRow } from "@/lib/compliance/rules";

export interface ComplianceValidationResult {
  isCompliant: boolean;
  violations: Array<{
    type: string;
    message: string;
    value?: number;
    limit?: number;
  }>;
}

/**
 * Validate a partial-unit property against the bedroom cap rule.
 * Logs violations but does NOT prevent save (soft enforcement).
 */
export async function validatePartialUnitCompliance(
  propertyId: string
): Promise<ComplianceValidationResult> {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { rentalUnits: true },
  });

  if (property.unitType !== "partial_unit") {
    return { isCompliant: true, violations: [] };
  }

  const violations: ComplianceValidationResult["violations"] = [];

  // Calculate total rooms offered across all rental units
  const totalRoomsOffered = property.rentalUnits.reduce((sum, unit) => sum + unit.roomsOffered, 0);

  // Resolve the bedroom cap rule
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

  const cap = resolvePartialUnitBedroomCap(ruleRows, property.bedroomCount, new Date());

  if (cap !== null && totalRoomsOffered > cap) {
    violations.push({
      type: "EXCEEDS_BEDROOM_CAP",
      message: `Offering ${totalRoomsOffered} rooms, but cap is ${cap} for a ${property.bedroomCount}-bedroom property`,
      value: totalRoomsOffered,
      limit: cap,
    });

    // Log the violation
    await prisma.complianceViolation.create({
      data: {
        propertyId,
        ruleType: "partial_unit_bedroom_cap",
        violationType: "EXCEEDS_BEDROOM_CAP",
        value: totalRoomsOffered,
        limit: cap,
      },
    });
  }

  return {
    isCompliant: violations.length === 0,
    violations,
  };
}
