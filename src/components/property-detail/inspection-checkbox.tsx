"use client";

import { useOptimistic, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleInspectionItem } from "@/app/actions/property-detail";

export function InspectionCheckbox({
  itemId,
  completed,
  label,
}: {
  itemId: string;
  completed: boolean;
  /** Accessible name — these checkboxes render beside their label text, not wrapped in a <label>. */
  label: string;
}) {
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(completed);
  const [, startTransition] = useTransition();

  return (
    <Checkbox
      aria-label={label}
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
