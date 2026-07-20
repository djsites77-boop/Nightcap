"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createCustomInspectionItem, deleteCustomInspectionItem } from "@/app/actions/property-detail";

export function CustomChecklistItemForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createCustomInspectionItem(fd);
          e.currentTarget.reset();
        });
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="text-sm font-semibold text-foreground">Add your own checklist item</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Item</Label>
          <Input id="label" name="label" required placeholder="e.g. Renew fire extinguisher inspection" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">Due by (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox name="required" defaultChecked />
        Count this toward the property&apos;s compliance status
      </label>
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}

export function DeleteChecklistItemButton({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => deleteCustomInspectionItem(itemId))}
    >
      {pending ? "…" : "Remove"}
    </Button>
  );
}
