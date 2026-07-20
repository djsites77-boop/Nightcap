"use client";

import { useTransition } from "react";
import { NativeSelect } from "@/components/ui/native-select";
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
    <NativeSelect
      defaultValue={currentTierId ?? ""}
      disabled={pending}
      aria-label="Subscription tier"
      onChange={(e) => {
        const tierId = e.target.value;
        if (!tierId) return;
        startTransition(() => setUserTier(userId, tierId));
      }}
      className="h-9 min-h-9 w-auto cursor-pointer rounded-xl px-2.5 pr-8 text-xs font-semibold"
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
    </NativeSelect>
  );
}
