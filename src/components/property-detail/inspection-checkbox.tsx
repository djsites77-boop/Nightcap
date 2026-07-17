"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleInspectionItem } from "@/app/actions/property-detail";

export function InspectionCheckbox({ itemId, completed }: { itemId: string; completed: boolean }) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed);
  const [, startTransition] = useTransition();

  return (
    <Checkbox
      checked={optimisticCompleted}
      onCheckedChange={(checked) => {
        const next = checked === true;
        startTransition(async () => {
          setOptimisticCompleted(next);
          await toggleInspectionItem(itemId, next);
        });
      }}
    />
  );
}
