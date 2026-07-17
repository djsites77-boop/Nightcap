"use client";

import { useTransition } from "react";
import { setUserTier } from "@/app/actions/admin";
import type { SubscriptionTierKey } from "@/lib/subscription-config";
import { TIER_CONFIG } from "@/lib/subscription-config";

export function TierSelect({ userId, currentTier }: { userId: string; currentTier: SubscriptionTierKey }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentTier}
      disabled={pending}
      onChange={(e) => startTransition(() => setUserTier(userId, e.target.value as SubscriptionTierKey))}
      className="rounded-md border border-border-strong bg-surface px-2 py-1 text-xs font-semibold"
    >
      {(Object.keys(TIER_CONFIG) as SubscriptionTierKey[]).map((tier) => (
        <option key={tier} value={tier}>
          {TIER_CONFIG[tier].label}
        </option>
      ))}
    </select>
  );
}
