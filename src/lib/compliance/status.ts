/**
 * Compliance status derivation (spec §6). Always computed from current data,
 * never stored.
 *
 * Deviation from the spec's literal pseudocode, worth flagging explicitly:
 * the v2 spec's pseudocode has an early return of OK for any partial_unit
 * property before the renewal countdown is ever checked ("if unit_type ==
 * partial_unit and no applicable cap rule → OK"). Read literally, a
 * partial-unit host's registration could be 2 days from expiring and the
 * dashboard would still show OK, which contradicts the renewal urgency every
 * host faces regardless of unit type. That early return only makes sense as
 * "skip the *night-cap* check" (partial-unit has no annual cap), not "skip
 * every check." This implementation keeps the renewal countdown live for
 * partial-unit properties and only exempts them from the nights-used
 * threshold — flagged here rather than silently changed.
 */

export type ComplianceStatus = "ok" | "warning" | "risk";

export interface StatusInput {
  unitType: "entire_home" | "partial_unit";
  nightsUsed: number;
  /** Null when no night-cap rule applies (partial_unit). */
  cap: number | null;
  /** Null when the property has no registration expiry on file yet. */
  daysToRenewal: number | null;
  /** UX buffer thresholds — tunable config, not bylaw facts (spec §6). */
  warningNightsRatio?: number;
  riskRenewalDays?: number;
  warningRenewalDays?: number;
}

export function computeComplianceStatus(input: StatusInput): ComplianceStatus {
  const {
    unitType,
    nightsUsed,
    cap,
    daysToRenewal,
    warningNightsRatio = 0.85,
    riskRenewalDays = 14,
    warningRenewalDays = 30,
  } = input;

  const hasNightCap = unitType === "entire_home" && cap !== null && cap > 0;
  const nightsAtRisk = hasNightCap && nightsUsed >= (cap as number);
  const nightsAtWarning = hasNightCap && nightsUsed >= (cap as number) * warningNightsRatio;

  const renewalAtRisk = daysToRenewal !== null && daysToRenewal < riskRenewalDays;
  const renewalAtWarning = daysToRenewal !== null && daysToRenewal < warningRenewalDays;

  if (nightsAtRisk || renewalAtRisk) return "risk";
  if (nightsAtWarning || renewalAtWarning) return "warning";
  return "ok";
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUtc - fromUtc) / msPerDay);
}
