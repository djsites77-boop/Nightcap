"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createInventoryAsset, deleteInventoryAsset, updateInventoryAssetStatus } from "@/app/actions/inventory";

const CATEGORY_LABELS: Record<string, string> = {
  appliance: "Appliance",
  furniture: "Furniture",
  electronics: "Electronics",
  linens_bedding: "Linens & bedding",
  kitchenware: "Kitchenware",
  safety_equipment: "Safety equipment",
  outdoor: "Outdoor",
  other: "Other",
};

const CONDITIONS = ["excellent", "good", "fair", "poor", "damaged"] as const;
const STATUSES = ["active", "needs_repair", "replaced", "removed"] as const;

export function InventoryAssetForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createInventoryAsset(fd);
          e.currentTarget.reset();
        });
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="text-sm font-semibold text-foreground">Add inventory item</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="e.g. Samsung fridge" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <NativeSelect id="category" name="category" defaultValue="furniture">
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condition">Condition</Label>
          <NativeSelect id="condition" name="condition" defaultValue="good" className="capitalize">
            {CONDITIONS.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationInProperty">Location</Label>
          <Input id="locationInProperty" name="locationInProperty" placeholder="e.g. Kitchen" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input id="purchaseDate" name="purchaseDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="purchasePrice">Purchase price (CAD)</Label>
          <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="warrantyExpiryDate">Warranty expires</Label>
          <Input id="warrantyExpiryDate" name="warrantyExpiryDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand">Brand / model</Label>
          <div className="flex gap-2">
            <Input id="brand" name="brand" placeholder="Brand" />
            <Input name="model" placeholder="Model" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" />
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add item"}
      </Button>
    </form>
  );
}

export function InventoryAssetRowActions({
  assetId,
  condition,
  status,
}: {
  assetId: string;
  condition: string;
  status: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <form
        onChange={(e) => {
          const fd = new FormData(e.currentTarget);
          start(() => updateInventoryAssetStatus(fd));
        }}
      >
        <input type="hidden" name="assetId" value={assetId} />
        <NativeSelect
          name="condition"
          defaultValue={condition}
          className="h-9 min-h-9 w-auto rounded-xl px-2.5 pr-8 text-xs capitalize"
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          name="status"
          defaultValue={status}
          className="ml-2 h-9 min-h-9 w-auto rounded-xl px-2.5 pr-8 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </NativeSelect>
      </form>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(() => deleteInventoryAsset(assetId))}
      >
        {pending ? "…" : "Delete"}
      </Button>
    </div>
  );
}
