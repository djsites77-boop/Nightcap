"use client";

import { useTransition } from "react";
import { setUserTier } from "@/app/actions/admin";
import type { TierOption } from "@/lib/subscription-config";

export function TierSelect({
  userId,
  currentTierId,
  tiers,
}: {
  userId: string;
  currentTierId: string | null;
  tiers: TierOption[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentTierId ?? ""}
      disabled={pending}
      aria-label="Subscription tier"
      onChange={(e) => {
        const tierId = e.target.value;
        if (!tierId) return;
        startTransition(() => setUserTier(userId, tierId));
      }}
      className="h-9 min-h-9 cursor-pointer rounded-md border border-border-strong bg-surface px-2.5 text-xs font-semibold transition-colors duration-150 hover:border-subtle-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
    >
      {currentTierId === null && (
        <option value="" disabled>
          — no subscription —
        </option>
      )}
      {tiers.map((tier) => (
        <option key={tier.id} value={tier.id}>
          {tier.name}
        </option>
      ))}
    </select>
  );
}
