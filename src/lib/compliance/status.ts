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

/** The subset of InspectionItem fields the status computation actually needs. */
export interface InspectionItemStatusInput {
  completed: boolean;
  required: boolean;
  /** Null for the default safety items, which have no inherent deadline. */
  dueDate: Date | null;
}

export interface StatusInput {
  unitType: "entire_home" | "partial_unit";
  nightsUsed: number;
  /** Null when no night-cap rule applies (partial_unit). */
  cap: number | null;
  /** Null when the property has no registration expiry on file yet. */
  daysToRenewal: number | null;
  /** Defaults to []: a property with no inspection items exerts no pressure. */
  inspectionItems?: InspectionItemStatusInput[];
  /** UX buffer thresholds — tunable config, not bylaw facts (spec §6). */
  warningNightsRatio?: number;
  riskRenewalDays?: number;
  warningRenewalDays?: number;
  warningInspectionDueDays?: number;
}

export function computeComplianceStatus(input: StatusInput): ComplianceStatus {
  const {
    unitType,
    nightsUsed,
    cap,
    daysToRenewal,
    inspectionItems = [],
    warningNightsRatio = 0.85,
    riskRenewalDays = 14,
    warningRenewalDays = 30,
    warningInspectionDueDays = 14,
  } = input;

  const hasNightCap = unitType === "entire_home" && cap !== null && cap > 0;
  const nightsAtRisk = hasNightCap && nightsUsed >= (cap as number);
  const nightsAtWarning = hasNightCap && nightsUsed >= (cap as number) * warningNightsRatio;

  const renewalAtRisk = daysToRenewal !== null && daysToRenewal < riskRenewalDays;
  const renewalAtWarning = daysToRenewal !== null && daysToRenewal < warningRenewalDays;

  const requiredIncomplete = inspectionItems.filter((i) => i.required && !i.completed);
  // Overdue (a due date has passed) is treated as risk, same as a blown
  // night cap or a near-expired registration — it's a real, live compliance
  // gap, not just an unconfirmed checklist item.
  const inspectionAtRisk = requiredIncomplete.some(
    (i) => i.dueDate !== null && i.dueDate.getTime() < Date.now()
  );
  // Warning covers two different situations: a required item with no due
  // date that's simply never been confirmed yet, or one with a due date
  // that's coming up but hasn't passed.
  const inspectionAtWarning = requiredIncomplete.some((i) => {
    if (i.dueDate === null) return true;
    const daysUntilDue = daysBetween(new Date(), i.dueDate);
    return daysUntilDue >= 0 && daysUntilDue <= warningInspectionDueDays;
  });

  if (nightsAtRisk || renewalAtRisk || inspectionAtRisk) return "risk";
  if (nightsAtWarning || renewalAtWarning || inspectionAtWarning) return "warning";
  return "ok";
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUtc - fromUtc) / msPerDay);
}
