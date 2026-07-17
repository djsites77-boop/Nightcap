import { describe, it, expect } from "vitest";
import {
  resolveEffectiveRule,
  resolveNightCapForYear,
  resolveMatRate,
  resolvePartialUnitBedroomCap,
  type ComplianceRuleRow,
} from "./rules";

const nightCapRules: ComplianceRuleRow[] = [
  {
    ruleType: "night_cap",
    unitType: "entire_home",
    value: { nights: 180 },
    effectiveDate: new Date("2024-01-01"),
  },
  {
    ruleType: "night_cap",
    unitType: "entire_home",
    value: { nights: 210 },
    effectiveDate: new Date("2026-06-01"), // a mid-2026 bylaw change
  },
];

describe("resolveNightCapForYear — fix: cap is pinned to Jan 1 of the year", () => {
  it("uses the rule in effect on Jan 1, ignoring a rule change later that same year", () => {
    // The 210-night rule took effect June 2026, but 2026's cap must stay 180
    // because that's what was in effect on Jan 1, 2026.
    expect(resolveNightCapForYear(nightCapRules, "entire_home", 2026)).toBe(180);
  });

  it("picks up the new rule for the following year", () => {
    expect(resolveNightCapForYear(nightCapRules, "entire_home", 2027)).toBe(210);
  });

  it("returns null when no rule is effective yet", () => {
    expect(resolveNightCapForYear(nightCapRules, "entire_home", 2020)).toBeNull();
  });
});

describe("resolveEffectiveRule — unit-type specificity", () => {
  const rules: ComplianceRuleRow[] = [
    { ruleType: "mat_rate", unitType: "all", value: { rate: 0.06 }, effectiveDate: new Date("2024-01-01") },
  ];

  it("falls back to an 'all' rule when no unit-specific rule exists", () => {
    expect(resolveMatRate(rules, "entire_home", new Date("2026-01-01"))).toBe(0.06);
  });

  it("prefers a unit-specific rule over 'all' at the same effective date", () => {
    const mixed: ComplianceRuleRow[] = [
      ...rules,
      {
        ruleType: "mat_rate",
        unitType: "entire_home",
        value: { rate: 0.08 },
        effectiveDate: new Date("2024-01-01"),
      },
    ];
    const resolved = resolveEffectiveRule<{ rate: number }>(mixed, {
      ruleType: "mat_rate",
      unitType: "entire_home",
      asOf: new Date("2026-01-01"),
    });
    expect(resolved?.value.rate).toBe(0.08);
  });
});

describe("resolvePartialUnitBedroomCap — fix #2", () => {
  const rules: ComplianceRuleRow[] = [
    {
      ruleType: "partial_unit_bedroom_cap",
      unitType: "partial_unit",
      value: { maxBedroomsSimultaneous: 3, oneFewerThanTotal: true },
      effectiveDate: new Date("2024-01-01"),
    },
  ];

  it("caps at bedroomCount - 1 for a small unit (2 bedrooms -> max 1)", () => {
    expect(resolvePartialUnitBedroomCap(rules, 2, new Date("2026-01-01"))).toBe(1);
  });

  it("caps at 3 for a large unit (6 bedrooms -> min(3, 5) = 3)", () => {
    expect(resolvePartialUnitBedroomCap(rules, 6, new Date("2026-01-01"))).toBe(3);
  });
});
