"use client";

import { useState, useTransition } from "react";
import { setMatRate } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Inline per-row editor: rate % + effective date (+ optional source URL). */
export function MatRateForm({
  municipalityId,
  currentRatePercent,
}: {
  municipalityId: string;
  currentRatePercent: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {currentRatePercent != null ? "Change" : "Set rate"}
      </Button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await setMatRate(formData);
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          }
        });
      }}
      className="flex flex-col gap-1.5 py-1"
    >
      <input type="hidden" name="municipalityId" value={municipalityId} />
      <div className="flex items-center gap-1.5">
        <Input
          name="ratePercent"
          type="number"
          min={0}
          max={30}
          step={0.001}
          required
          defaultValue={currentRatePercent ?? ""}
          placeholder="6"
          className="h-8 w-20 text-xs"
          aria-label="Rate percent"
        />
        <span className="text-xs text-subtle-foreground">%</span>
        <Input
          name="effectiveDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="h-8 w-36 text-xs"
          aria-label="Effective date"
        />
      </div>
      <Input name="sourceUrl" type="url" placeholder="Source URL (bylaw page)" className="h-8 text-xs" />
      {error && <p className="text-xs font-semibold text-status-risk">{error}</p>}
      <div className="flex gap-1.5">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
