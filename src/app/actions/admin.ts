"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { TIER_CONFIG, type SubscriptionTierKey } from "@/lib/subscription";
import { suggestRuleFromText, type RuleSuggestion } from "@/lib/rule-extraction";

export async function setUserTier(userId: string, tier: SubscriptionTierKey) {
  await requireAdmin();
  const config = TIER_CONFIG[tier];

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      propertyLimit: config.propertyLimit,
      pricePerPropertyCents: config.pricePerPropertyCents,
    },
    update: { tier, propertyLimit: config.propertyLimit, pricePerPropertyCents: config.pricePerPropertyCents },
  });

  revalidatePath("/admin/users");
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
}

export async function toggleMunicipalityActive(municipalityId: string, active: boolean) {
  await requireAdmin();
  await prisma.municipality.update({ where: { id: municipalityId }, data: { active } });
  revalidatePath("/admin/rules");
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
    },
    update: { value, sourceUrl: parsed.sourceUrl },
  });

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
