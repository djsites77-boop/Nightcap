/**
 * Pure subscription-tier config — no Prisma/db import, safe to use from
 * Client Components (see components/admin/tier-select.tsx). Prisma-touching
 * helpers (ensureSubscription) live in lib/subscription.ts instead.
 */
export const TIER_CONFIG = {
  free: { label: "Free", propertyLimit: 1, pricePerPropertyCents: 0 },
  starter: { label: "Starter", propertyLimit: 5, pricePerPropertyCents: 500 },
  growth: { label: "Growth", propertyLimit: 15, pricePerPropertyCents: 400 },
  portfolio: { label: "Portfolio", propertyLimit: null as number | null, pricePerPropertyCents: 350 },
} as const;

export type SubscriptionTierKey = keyof typeof TIER_CONFIG;

export function estimatedMonthlyCents(tier: SubscriptionTierKey, propertyCount: number): number {
  return TIER_CONFIG[tier].pricePerPropertyCents * propertyCount;
}

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}
