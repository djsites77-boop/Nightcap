import { prisma } from "@/lib/db";
import { TIER_CONFIG } from "@/lib/subscription-config";

export { TIER_CONFIG, estimatedMonthlyCents, daysSince } from "@/lib/subscription-config";
export type { SubscriptionTierKey } from "@/lib/subscription-config";

export async function ensureSubscription(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      userId,
      tier: "free",
      propertyLimit: TIER_CONFIG.free.propertyLimit,
      pricePerPropertyCents: TIER_CONFIG.free.pricePerPropertyCents,
    },
  });
}
