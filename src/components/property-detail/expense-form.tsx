"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense, deleteExpense, getExpensesCsv, suggestExpenseFromReceipt } from "@/app/actions/expenses";

const CATEGORY_LABELS: Record<string, string> = {
  advertising: "Advertising",
  insurance: "Insurance",
  interest_mortgage: "Mortgage interest",
  professional_fees: "Professional fees",
  management_fees: "Management fees",
  repairs_maintenance: "Repairs & maintenance",
  supplies: "Supplies",
  property_tax: "Property tax",
  travel: "Travel",
  utilities: "Utilities",
  cleaning: "Cleaning",
  platform_fees: "Platform fees (Airbnb/VRBO)",
  other: "Other",
};

export function ExpenseForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [prefill, setPrefill] = React.useState<{
    vendorName: string;
    incurredOn: string;
    amount: string;
    category: string;
  } | null>(null);

  async function handleScan(file: File) {
    setScanning(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("receipt", file);
      const suggestion = await suggestExpenseFromReceipt(fd);
      setPrefill({
        vendorName: suggestion.vendorName ?? "",
        incurredOn: suggestion.incurredOn ?? "",
        amount: suggestion.totalAmountCents != null ? (suggestion.totalAmountCents / 100).toFixed(2) : "",
        category: suggestion.suggestedCategory ?? "other",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt");
    } finally {
      setScanning(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await createExpense(fd);
            e.currentTarget.reset();
            setPrefill(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save expense");
          }
        });
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="text-sm font-semibold text-foreground">Log an expense</div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="receipt">Receipt photo (optional)</Label>
        <Input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleScan(file);
          }}
        />
        {scanning && <p className="text-xs text-subtle-foreground">Reading receipt…</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm"
            defaultValue={prefill?.category ?? "other"}
            key={prefill?.category ?? "default"}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendorName">Vendor</Label>
          <Input id="vendorName" name="vendorName" defaultValue={prefill?.vendorName} key={`v-${prefill?.vendorName}`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount (CAD)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={prefill?.amount}
            key={`a-${prefill?.amount}`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="incurredOn">Date</Label>
          <Input
            id="incurredOn"
            name="incurredOn"
            type="date"
            required
            defaultValue={prefill?.incurredOn}
            key={`d-${prefill?.incurredOn}`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required placeholder="e.g. Replacement smoke detectors" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add expense"}
      </Button>
    </form>
  );
}

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => deleteExpense(expenseId))}>
      {pending ? "…" : "Delete"}
    </Button>
  );
}

export function ExportExpensesCsvButton({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const csv = await getExpensesCsv(propertyId);
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `expenses-${propertyId}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        })
      }
    >
      {pending ? "Exporting…" : "Export CSV for accountant"}
    </Button>
  );
}
