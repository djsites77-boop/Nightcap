import { describe, it, expect } from "vitest";
import { computeComplianceStatus, daysBetween } from "./status";

describe("computeComplianceStatus", () => {
  it("is OK well under the cap with no renewal pressure", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 40, cap: 180, daysToRenewal: 90 })
    ).toBe("ok");
  });

  it("is WARNING at exactly the 85% nights threshold", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 153, cap: 180, daysToRenewal: 90 })
    ).toBe("warning"); // 153 / 180 = 0.85 exactly
  });

  it("is RISK once nights reach the cap", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 180, cap: 180, daysToRenewal: 90 })
    ).toBe("risk");
  });

  it("is RISK on renewal countdown alone, even with plenty of nights left", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 10, cap: 180, daysToRenewal: 9 })
    ).toBe("risk");
  });

  it("is WARNING on renewal countdown alone (< 30 days)", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 10, cap: 180, daysToRenewal: 22 })
    ).toBe("warning");
  });

  it("partial_unit has no night cap, but its renewal countdown still applies (deviation noted in status.ts)", () => {
    expect(
      computeComplianceStatus({ unitType: "partial_unit", nightsUsed: 999, cap: null, daysToRenewal: 90 })
    ).toBe("ok");
    expect(
      computeComplianceStatus({ unitType: "partial_unit", nightsUsed: 0, cap: null, daysToRenewal: 5 })
    ).toBe("risk");
  });

  it("treats a null registration expiry as no renewal pressure, not a crash", () => {
    expect(
      computeComplianceStatus({ unitType: "entire_home", nightsUsed: 10, cap: 180, daysToRenewal: null })
    ).toBe("ok");
  });
});

describe("daysBetween", () => {
  it("counts whole days regardless of time-of-day", () => {
    expect(daysBetween(new Date("2026-07-17T23:00:00Z"), new Date("2026-07-20T01:00:00Z"))).toBe(3);
  });
});
