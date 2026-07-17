"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markMatRemitted } from "@/app/actions/property-detail";

export function MarkRemittedButton({ matPeriodId }: { matPeriodId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => markMatRemitted(matPeriodId))}
    >
      {pending ? "Saving…" : "Mark remitted"}
    </Button>
  );
}
