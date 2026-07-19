"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { suggestRuleFromText, type RuleSuggestion } from "@/lib/rule-extraction";
import { refreshDueMatRates } from "@/lib/mat-ledger";

// ---------------------------------------------------------------------------
// User tier assignment
// ---------------------------------------------------------------------------

const setUserTierSchema = z.object({
  userId: z.string().min(1),
  tierId: z.string().min(1),
});

export async function setUserTier(userId: string, tierId: string) {
  const session = await requireAdmin();
  const parsed = setUserTierSchema.parse({ userId, tierId });

  const tier = await prisma.pricingTier.findUniqueOrThrow({ where: { id: parsed.tierId } });
  if (!tier.active) throw new Error(`${tier.name} is deactivated — reactivate it before assigning.`);

  // Snapshot limit/price at assignment time (see PricingTier schema comment).
  await prisma.subscription.upsert({
    where: { userId: parsed.userId },
    create: {
      userId: parsed.userId,
      tierId: tier.id,
      propertyLimit: tier.propertyLimit,
      pricePerPropertyCents: tier.pricePerPropertyCents,
    },
    update: {
      tierId: tier.id,
      propertyLimit: tier.propertyLimit,
      pricePerPropertyCents: tier.pricePerPropertyCents,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_tier_assigned",
      payload: { targetUserId: parsed.userId, tierId: tier.id, tierCode: tier.code },
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Pricing tier catalog CRUD (/admin/tiers)
// ---------------------------------------------------------------------------

const tierFieldsSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Code is required")
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Code must be lowercase letters/numbers/dashes"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().optional(),
  // Empty string = unlimited
  propertyLimit: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1), "Property limit must be a whole number ≥ 1 (or blank for unlimited)"),
  pricePerProperty: z.coerce
    .number()
    .min(0, "Price can't be negative")
    .max(10000, "Price looks wrong — that's per property per month"),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

function parseTierForm(formData: FormData) {
  return tierFieldsSchema.parse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    propertyLimit: formData.get("propertyLimit") ?? "",
    pricePerProperty: formData.get("pricePerProperty"),
    displayOrder: formData.get("displayOrder") || 0,
  });
}

export async function createPricingTier(formData: FormData) {
  const session = await requireAdmin();
  const data = parseTierForm(formData);

  const existing = await prisma.pricingTier.findUnique({ where: { code: data.code } });
  if (existing) throw new Error(`A tier with code "${data.code}" already exists.`);

  const tier = await prisma.pricingTier.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description || null,
      propertyLimit: data.propertyLimit,
      pricePerPropertyCents: Math.round(data.pricePerProperty * 100),
      displayOrder: data.displayOrder,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_tier_created",
      payload: { tierId: tier.id, code: tier.code, pricePerPropertyCents: tier.pricePerPropertyCents },
    },
  });

  revalidatePath("/admin/tiers");
}

export async function updatePricingTier(tierId: string, formData: FormData) {
  const session = await requireAdmin();
  const data = parseTierForm(formData);

  const clash = await prisma.pricingTier.findUnique({ where: { code: data.code } });
  if (clash && clash.id !== tierId) throw new Error(`A different tier already uses code "${data.code}".`);

  // Snapshots on existing subscriptions are intentionally NOT touched here —
  // re-assign a user's tier in /admin/users to apply the new price to them.
  const tier = await prisma.pricingTier.update({
    where: { id: tierId },
    data: {
      code: data.code,
      name: data.name,
      description: data.description || null,
      propertyLimit: data.propertyLimit,
      pricePerPropertyCents: Math.round(data.pricePerProperty * 100),
      displayOrder: data.displayOrder,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_tier_updated",
      payload: { tierId: tier.id, code: tier.code, pricePerPropertyCents: tier.pricePerPropertyCents },
    },
  });

  revalidatePath("/admin/tiers");
  revalidatePath("/admin/users");
}

export async function setTierActive(tierId: string, active: boolean) {
  const session = await requireAdmin();

  const tier = await prisma.pricingTier.findUniqueOrThrow({ where: { id: tierId } });
  if (!active && tier.isDefault) {
    throw new Error("This is the signup default tier — pick a different default before deactivating it.");
  }

  await prisma.pricingTier.update({ where: { id: tierId }, data: { active } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: active ? "admin_tier_activated" : "admin_tier_deactivated",
      payload: { tierId, code: tier.code },
    },
  });

  revalidatePath("/admin/tiers");
}

export async function setDefaultTier(tierId: string) {
  const session = await requireAdmin();

  const tier = await prisma.pricingTier.findUniqueOrThrow({ where: { id: tierId } });
  if (!tier.active) throw new Error("The signup default must be an active tier.");

  await prisma.$transaction([
    prisma.pricingTier.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    prisma.pricingTier.update({ where: { id: tierId }, data: { isDefault: true } }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_default_tier_changed",
      payload: { tierId, code: tier.code },
    },
  });

  revalidatePath("/admin/tiers");
}

export async function deletePricingTier(tierId: string) {
  const session = await requireAdmin();

  const tier = await prisma.pricingTier.findUniqueOrThrow({
    where: { id: tierId },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (tier.isDefault) throw new Error("Can't delete the signup default tier.");
  if (tier._count.subscriptions > 0) {
    throw new Error(
      `${tier._count.subscriptions} subscription(s) reference this tier — move those users first, or deactivate the tier instead.`
    );
  }

  await prisma.pricingTier.delete({ where: { id: tierId } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_tier_deleted",
      payload: { tierId, code: tier.code },
    },
  });

  revalidatePath("/admin/tiers");
}

// ---------------------------------------------------------------------------
// Jurisdiction tax rates (/admin/tax-rates) — a friendlier front door to the
// same ComplianceRule rows the full rules editor manages. Setting a rate
// creates a dated mat_rate rule; property MAT ledgers resolve the rate from
// these rows by municipality (lib/mat-ledger.ts), so the correct rate is
// applied per property automatically.
// ---------------------------------------------------------------------------

const setMatRateSchema = z.object({
  municipalityId: z.string().min(1),
  // Percent as typed by the admin, e.g. "6" or "8.5"
  ratePercent: z.coerce.number().min(0, "Rate can't be negative").max(30, "That's a percent — 6, not 0.06"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  sourceUrl: z.string().trim().optional(),
});

export async function setMatRate(formData: FormData) {
  const session = await requireAdmin();
  const parsed = setMatRateSchema.parse({
    municipalityId: formData.get("municipalityId"),
    ratePercent: formData.get("ratePercent"),
    effectiveDate: formData.get("effectiveDate"),
    sourceUrl: formData.get("sourceUrl") || undefined,
  });

  const rate = Math.round(parsed.ratePercent * 1000) / 100000; // percent -> fraction, 3-decimal-percent precision
  const effectiveDate = new Date(parsed.effectiveDate);

  await prisma.complianceRule.upsert({
    where: {
      municipalityId_ruleType_unitType_effectiveDate: {
        municipalityId: parsed.municipalityId,
        ruleType: "mat_rate",
        unitType: "all",
        effectiveDate,
      },
    },
    create: {
      municipalityId: parsed.municipalityId,
      ruleType: "mat_rate",
      unitType: "all",
      value: { rate },
      effectiveDate,
      sourceUrl: parsed.sourceUrl,
      verifiedAt: new Date(),
    },
    update: { value: { rate }, sourceUrl: parsed.sourceUrl, verifiedAt: new Date() },
  });

  // Re-freeze the rate on open (due) MAT periods for properties in this
  // municipality; remitted history is never rewritten.
  await refreshDueMatRates(parsed.municipalityId);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "admin_mat_rate_set",
      payload: {
        municipalityId: parsed.municipalityId,
        rate,
        effectiveDate: effectiveDate.toISOString(),
      },
    },
  });

  revalidatePath("/admin/tax-rates");
  revalidatePath(`/admin/rules/${parsed.municipalityId}`);
}

const createMunicipalitySchema = z.object({
  name: z.string().trim().min(1),
  province: z.string().trim().min(1),
  active: z.coerce.boolean(),
});

export async function createMunicipality(formData: FormData) {
  await requireAdmin();
  const parsed = createMunicipalitySchema.parse({
    name: formData.get("name"),
    province: formData.get("province"),
    active: formData.get("active") === "on",
  });

  await prisma.municipality.create({ data: parsed });
  revalidatePath("/admin/rules");
  revalidatePath("/admin/tax-rates");
}

export async function toggleMunicipalityActive(municipalityId: string, active: boolean) {
  await requireAdmin();
  await prisma.municipality.update({ where: { id: municipalityId }, data: { active } });
  revalidatePath("/admin/rules");
  revalidatePath("/admin/tax-rates");
}

const ruleTypeEnum = z.enum([
  "night_cap",
  "mat_rate",
  "registration_fee",
  "occupancy_limit",
  "record_retention_years",
  "partial_unit_bedroom_cap",
]);
const unitTypeEnum = z.enum(["entire_home", "partial_unit", "all"]);

const upsertRuleSchema = z.object({
  municipalityId: z.string().min(1),
  ruleType: ruleTypeEnum,
  unitType: unitTypeEnum,
  value: z.string().min(1), // raw JSON text from the textarea, parsed below
  effectiveDate: z.string().min(1),
  sourceUrl: z.string().trim().optional(),
});

export async function upsertComplianceRule(formData: FormData) {
  await requireAdmin();
  const parsed = upsertRuleSchema.parse({
    municipalityId: formData.get("municipalityId"),
    ruleType: formData.get("ruleType"),
    unitType: formData.get("unitType"),
    value: formData.get("value"),
    effectiveDate: formData.get("effectiveDate"),
    sourceUrl: formData.get("sourceUrl") || undefined,
  });

  let value: object;
  try {
    value = JSON.parse(parsed.value);
  } catch {
    throw new Error("Value must be valid JSON, e.g. {\"nights\": 180}");
  }

  await prisma.complianceRule.upsert({
    where: {
      municipalityId_ruleType_unitType_effectiveDate: {
        municipalityId: parsed.municipalityId,
        ruleType: parsed.ruleType,
        unitType: parsed.unitType,
        effectiveDate: new Date(parsed.effectiveDate),
      },
    },
    create: {
      municipalityId: parsed.municipalityId,
      ruleType: parsed.ruleType,
      unitType: parsed.unitType,
      value,
      effectiveDate: new Date(parsed.effectiveDate),
      sourceUrl: parsed.sourceUrl,
      verifiedAt: new Date(),
    },
    update: { value, sourceUrl: parsed.sourceUrl, verifiedAt: new Date() },
  });

  if (parsed.ruleType === "mat_rate") {
    await refreshDueMatRates(parsed.municipalityId);
    revalidatePath("/admin/tax-rates");
  }

  revalidatePath(`/admin/rules/${parsed.municipalityId}`);
}

/**
 * Suggestion only — returns a proposed rule for the admin to review and edit
 * in the form; nothing is written to ComplianceRule here. Saving still goes
 * through upsertComplianceRule above, which the admin submits explicitly.
 */
export async function requestRuleSuggestion(bylawText: string, ruleTypeHint?: string): Promise<RuleSuggestion> {
  await requireAdmin();
  if (bylawText.trim().length < 20) {
    throw new Error("Paste more of the bylaw text — that's too short to extract anything reliable from.");
  }
  return suggestRuleFromText(bylawText, ruleTypeHint);
}
