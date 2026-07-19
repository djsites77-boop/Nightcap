/**
 * Client-safe subscription helpers — no Prisma/db import, usable from Client
 * Components (see components/admin/tier-select.tsx). The tier catalog itself
 * lives in the PricingTier table (managed in /admin/tiers); server code loads
 * it via lib/subscription.ts and passes plain TierOption objects down.
 */

/** Serializable shape of a PricingTier for passing into Client Components. */
export interface TierOption {
  id: string;
  code: string;
  name: string;
  propertyLimit: number | null;
  pricePerPropertyCents: number;
}

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}
