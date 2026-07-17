/**
 * Rules engine lookup (spec §2). Compliance thresholds are rows in
 * ComplianceRule, never application constants — this module resolves "the
 * current rule" for a given municipality/rule type/unit type as of a date.
 *
 * "Current" = the row with the latest effectiveDate <= the date being
 * evaluated. A unit-type-specific rule (entire_home/partial_unit) always
 * wins over an "all" rule at the same effective date, since it's more
 * specific. The ComplianceRule.unique constraint on
 * (municipalityId, ruleType, unitType, effectiveDate) is what keeps this
 * lookup from ever being ambiguous.
 */

export type RuleUnitType = "entire_home" | "partial_unit" | "all";

export interface ComplianceRuleRow {
  ruleType: string;
  unitType: RuleUnitType;
  value: unknown;
  effectiveDate: Date;
}

function specificity(unitType: RuleUnitType): number {
  return unitType === "all" ? 0 : 1;
}

export function resolveEffectiveRule<T = unknown>(
  rules: ComplianceRuleRow[],
  params: { ruleType: string; unitType: "entire_home" | "partial_unit"; asOf: Date }
): { value: T; effectiveDate: Date } | null {
  const candidates = rules.filter(
    (r) =>
      r.ruleType === params.ruleType &&
      (r.unitType === params.unitType || r.unitType === "all") &&
      r.effectiveDate.getTime() <= params.asOf.getTime()
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const bySpecificity = specificity(b.unitType) - specificity(a.unitType);
    if (bySpecificity !== 0) return bySpecificity;
    return b.effectiveDate.getTime() - a.effectiveDate.getTime();
  });

  return { value: candidates[0].value as T, effectiveDate: candidates[0].effectiveDate };
}

/**
 * The night cap for a calendar year is resolved once, using the rule in
 * effect on January 1 of that year — not "today" — so a mid-year rule change
 * never retroactively alters months already elapsed in the same year (§6).
 */
export function resolveNightCapForYear(
  rules: ComplianceRuleRow[],
  unitType: "entire_home" | "partial_unit",
  calendarYear: number
): number | null {
  const jan1 = new Date(Date.UTC(calendarYear, 0, 1));
  const rule = resolveEffectiveRule<{ nights: number }>(rules, {
    ruleType: "night_cap",
    unitType,
    asOf: jan1,
  });
  return rule ? rule.value.nights : null;
}

export function resolveMatRate(
  rules: ComplianceRuleRow[],
  unitType: "entire_home" | "partial_unit",
  asOf: Date
): number | null {
  const rule = resolveEffectiveRule<{ rate: number }>(rules, {
    ruleType: "mat_rate",
    unitType,
    asOf,
  });
  return rule ? rule.value.rate : null;
}

/**
 * Fix #2: the partial-unit bedroom cap — min(3, bedroomCount - 1) per Toronto
 * bylaw, but the "3" and the "one fewer than total" are both rule data
 * (compound value), not literals, so a future municipality can express this
 * differently.
 */
export function resolvePartialUnitBedroomCap(
  rules: ComplianceRuleRow[],
  bedroomCount: number,
  asOf: Date
): number | null {
  const rule = resolveEffectiveRule<{ maxBedroomsSimultaneous: number; oneFewerThanTotal: boolean }>(
    rules,
    { ruleType: "partial_unit_bedroom_cap", unitType: "partial_unit", asOf }
  );
  if (!rule) return null;
  const { maxBedroomsSimultaneous, oneFewerThanTotal } = rule.value;
  return oneFewerThanTotal
    ? Math.min(maxBedroomsSimultaneous, bedroomCount - 1)
    : maxBedroomsSimultaneous;
}
