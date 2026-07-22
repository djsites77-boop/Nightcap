"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TypeaheadSelect } from "@/components/ui/typeahead-select";
import { FilePickField } from "@/components/ui/file-pick-field";
import {
  createExpense,
  deleteExpense,
  getExpensesCsv,
  suggestExpenseFromReceipt,
} from "@/app/actions/expenses";
import type { ReceiptSuggestion } from "@/lib/receipt-parsing";
import { ViewDocumentButton } from "@/components/property-detail/view-document-button";
import { RECEIPT_ACCEPT } from "@/lib/upload-accept";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "advertising", label: "Advertising" },
  { value: "insurance", label: "Insurance" },
  { value: "interest_mortgage", label: "Mortgage interest" },
  { value: "professional_fees", label: "Professional fees" },
  { value: "management_fees", label: "Management fees" },
  { value: "repairs_maintenance", label: "Repairs & maintenance" },
  { value: "supplies", label: "Supplies" },
  { value: "property_tax", label: "Property tax" },
  { value: "travel", label: "Travel" },
  { value: "utilities", label: "Utilities" },
  { value: "cleaning", label: "Cleaning" },
  { value: "platform_fees", label: "Platform fees (Airbnb/VRBO)" },
  { value: "other", label: "Other" },
];

const INVENTORY_OPTIONS = [
  { value: "appliance", label: "Appliance" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "linens_bedding", label: "Linens & bedding" },
  { value: "kitchenware", label: "Kitchenware" },
  { value: "safety_equipment", label: "Safety equipment" },
  { value: "outdoor", label: "Outdoor" },
  { value: "other", label: "Other" },
];

export function ExpenseForm({
  propertyId,
  propertyNickname,
}: {
  propertyId: string;
  propertyNickname?: string;
}) {
  const [pending, start] = useTransition();
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [scope, setScope] = React.useState<"property" | "general">("property");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagDraft, setTagDraft] = React.useState("");
  const [addToInventory, setAddToInventory] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<ReceiptSuggestion | null>(null);

  const [vendorName, setVendorName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [incurredOn, setIncurredOn] = React.useState("");
  const [category, setCategory] = React.useState("other");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [inventoryName, setInventoryName] = React.useState("");
  const [inventoryCategory, setInventoryCategory] = React.useState("other");
  const [brand, setBrand] = React.useState("");
  const [model, setModel] = React.useState("");

  function resetForm() {
    setFile(null);
    setSuggestion(null);
    setTags([]);
    setTagDraft("");
    setAddToInventory(false);
    setVendorName("");
    setDescription("");
    setAmount("");
    setIncurredOn("");
    setCategory("other");
    setWarrantyExpiryDate("");
    setNotes("");
    setInventoryName("");
    setInventoryCategory("other");
    setBrand("");
    setModel("");
    setScope("property");
    setFormKey((k) => k + 1);
  }

  function applySuggestion(s: ReceiptSuggestion) {
    setSuggestion(s);
    if (s.vendorName) setVendorName(s.vendorName);
    if (s.description) setDescription(s.description);
    else if (s.vendorName) setDescription(`Purchase at ${s.vendorName}`);
    if (s.totalAmountCents != null) setAmount((s.totalAmountCents / 100).toFixed(2));
    if (s.incurredOn) setIncurredOn(s.incurredOn);
    if (s.suggestedCategory) setCategory(s.suggestedCategory);
    if (s.warrantyExpiryDate) setWarrantyExpiryDate(s.warrantyExpiryDate);
    if (s.summary) setNotes(s.summary);
    if (s.suggestedTags?.length) setTags(s.suggestedTags);
    if (s.isInventoryPurchase) {
      setAddToInventory(true);
      if (s.inventoryName) setInventoryName(s.inventoryName);
      if (s.inventoryCategory) setInventoryCategory(s.inventoryCategory);
      if (s.brand) setBrand(s.brand);
      if (s.model) setModel(s.model);
    }
  }

  async function handleScan(next: File) {
    setScanning(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("receipt", next);
      fd.set("propertyId", scope === "property" ? propertyId : "general");
      const s = await suggestExpenseFromReceipt(fd);
      applySuggestion(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt");
    } finally {
      setScanning(false);
    }
  }

  function addTagFromDraft() {
    const t = tagDraft.trim();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t].slice(0, 12)));
    setTagDraft("");
  }

  return (
    <form
      key={formKey}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (file) fd.set("receipt", file);
        fd.set("propertyId", scope === "property" ? propertyId : "general");
        fd.set("tags", tags.join(","));
        fd.set("addToInventory", addToInventory ? "true" : "false");
        fd.set("vendorName", vendorName);
        fd.set("description", description);
        fd.set("amount", amount);
        fd.set("incurredOn", incurredOn);
        fd.set("category", category);
        fd.set("warrantyExpiryDate", warrantyExpiryDate);
        fd.set("notes", notes);
        fd.set("inventoryName", inventoryName);
        fd.set("inventoryCategory", inventoryCategory);
        fd.set("brand", brand);
        fd.set("model", model);
        setError(null);
        start(async () => {
          try {
            await createExpense(fd);
            resetForm();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save expense");
          }
        });
      }}
    >
      <div className="text-sm font-semibold text-foreground">Log an expense</div>

      <div className="flex flex-col gap-1.5">
        <Label>Charge to</Label>
        <div className="flex rounded-full bg-brand-soft/80 p-1">
          <button
            type="button"
            onClick={() => setScope("property")}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              scope === "property"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {propertyNickname ?? "This listing"}
          </button>
          <button
            type="button"
            onClick={() => {
              setScope("general");
              setAddToInventory(false);
            }}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              scope === "general"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            General
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Receipt</Label>
        <FilePickField
          accept={RECEIPT_ACCEPT}
          label="Drop receipt or browse"
          hint="PDF or photo · max 8MB · AI fills vendor, amount, tags"
          onFileChange={(f) => {
            setFile(f);
            if (f) void handleScan(f);
          }}
        />
        {scanning && <p className="text-xs font-semibold text-accent">Reading receipt with AI…</p>}
        {suggestion && (
          <p className="text-xs font-medium text-muted-foreground">
            AI confidence: {suggestion.confidence}
            {suggestion.summary ? ` — ${suggestion.summary}` : ""}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <TypeaheadSelect
            key={`category-${category}-${formKey}`}
            id="category"
            name="category"
            options={CATEGORY_OPTIONS}
            defaultValue={category}
            placeholder="Type a category…"
            required
            onValueChange={setCategory}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendorName">Vendor</Label>
          <Input
            id="vendorName"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Store or contractor"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
              CAD
            </span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="pl-12"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="incurredOn">Date</Label>
          <Input
            id="incurredOn"
            type="date"
            required
            value={incurredOn}
            onChange={(e) => setIncurredOn(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Replacement smoke detectors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="warrantyExpiryDate">Warranty / return-by</Label>
        <Input
          id="warrantyExpiryDate"
          type="date"
          value={warrantyExpiryDate}
          onChange={(e) => setWarrantyExpiryDate(e.target.value)}
        />
        <p className="text-[11px] font-medium text-subtle-foreground">
          Optional — leave blank if none. AI fills this when it&apos;s on the receipt.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Smart tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
              className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent-strong"
              title="Remove tag"
            >
              {t} ×
            </button>
          ))}
        </div>
        <Input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              if (tagDraft.trim()) {
                e.preventDefault();
                addTagFromDraft();
              }
            }
          }}
          onBlur={addTagFromDraft}
          placeholder="Type a tag, press Enter"
        />
      </div>

      {scope === "property" && (
        <label className="flex items-start gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={addToInventory}
            onChange={(e) => setAddToInventory(e.target.checked)}
          />
          <span>
            <span className="font-bold text-foreground">Also add to inventory</span>
            <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
              For appliances, furniture, electronics — warranty stays on the item.
            </span>
          </span>
        </label>
      )}

      {addToInventory && scope === "property" && (
        <div className="grid gap-3 rounded-2xl border border-dashed border-border-strong p-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="inventoryName">Item name</Label>
            <Input
              id="inventoryName"
              value={inventoryName}
              onChange={(e) => setInventoryName(e.target.value)}
              placeholder="e.g. Samsung microwave"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inventoryCategory">Inventory category</Label>
            <TypeaheadSelect
              key={`inv-cat-${inventoryCategory}-${formKey}`}
              id="inventoryCategory"
              name="inventoryCategory"
              options={INVENTORY_OPTIONS}
              defaultValue={inventoryCategory}
              onValueChange={setInventoryCategory}
              placeholder="Type a category…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending || scanning} className="w-fit">
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

export function ExpenseReceiptCell({
  receiptDocumentId,
}: {
  receiptDocumentId: string | null;
}) {
  if (!receiptDocumentId) return <span className="text-subtle-foreground">—</span>;
  return <ViewDocumentButton documentId={receiptDocumentId} />;
}
