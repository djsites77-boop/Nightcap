"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { retryCalendarSync } from "@/app/actions/property-detail";

export function RetrySyncButton({ calendarConnectionId }: { calendarConnectionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => retryCalendarSync(calendarConnectionId))}
    >
      {pending ? "Syncing…" : "Retry sync now"}
    </Button>
  );
}
