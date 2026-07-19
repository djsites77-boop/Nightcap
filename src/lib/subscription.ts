import { prisma } from "@/lib/db";

export { daysSince } from "@/lib/subscription-config";
export type { TierOption } from "@/lib/subscription-config";

/**
 * Tiers are PricingTier rows managed in /admin/tiers, not application
 * constants. The default tier (isDefault) is what new signups land on; if an
 * admin deactivated it without picking a new default, fall back to the
 * cheapest active tier rather than blocking signups.
 */
export async function getDefaultTier() {
  const byFlag = await prisma.pricingTier.findFirst({
    where: { isDefault: true, active: true },
    orderBy: { displayOrder: "asc" },
  });
  if (byFlag) return byFlag;

  const cheapest = await prisma.pricingTier.findFirst({
    where: { active: true },
    orderBy: [{ pricePerPropertyCents: "asc" }, { displayOrder: "asc" }],
  });
  if (!cheapest) {
    throw new Error("No active pricing tiers exist — create one in /admin/tiers (or run the seed).");
  }
  return cheapest;
}

/** All tiers a user could be assigned to, in display order. */
export async function listActiveTiers() {
  return prisma.pricingTier.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { pricePerPropertyCents: "asc" }],
  });
}

export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });
  if (existing) return existing;

  const tier = await getDefaultTier();
  return prisma.subscription.create({
    data: {
      userId,
      tierId: tier.id,
      // Snapshot limit/price at assignment time (see schema comment) so later
      // catalog edits don't silently reprice existing hosts.
      propertyLimit: tier.propertyLimit,
      pricePerPropertyCents: tier.pricePerPropertyCents,
    },
    include: { tier: true },
  });
}
