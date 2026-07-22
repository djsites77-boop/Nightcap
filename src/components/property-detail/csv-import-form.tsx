"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TypeaheadSelect } from "@/components/ui/typeahead-select";
import { FilePickField } from "@/components/ui/file-pick-field";
import { importTransactionCsv, type CsvImportResult } from "@/app/actions/csv-import";

const EXPORT_OPTIONS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "vrbo", label: "VRBO" },
];

export function CsvImportForm({ propertyId }: { propertyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        setResult(null);
        startTransition(async () => {
          try {
            const res = await importTransactionCsv(propertyId, formData);
            setResult(res);
            formRef.current?.reset();
            setHasFile(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
          }
        });
      }}
    >
      <p className="text-sm font-semibold text-foreground">Backfill revenue from CSV</p>
      <p className="text-xs font-medium leading-relaxed text-muted-foreground">
        Export from Airbnb or VRBO, then drop the file here to fill in amounts on matching stays.
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="csv-platform">Export from</Label>
          <TypeaheadSelect
            id="csv-platform"
            name="platform"
            options={EXPORT_OPTIONS}
            defaultValue="airbnb"
            placeholder="Airbnb or VRBO"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>CSV file</Label>
          <FilePickField
            name="csv"
            accept=".csv,text/csv"
            required
            label="Drop CSV or browse"
            hint="Airbnb / VRBO transaction export"
            onFileChange={(f) => setHasFile(Boolean(f))}
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending || !hasFile} className="w-fit">
        {pending ? "Importing…" : "Import revenue"}
      </Button>
      {result && (
        <p className="text-xs font-semibold text-status-ok">
          Matched {result.matched} of {result.totalRows} rows to existing bookings
          {result.unmatched > 0 ? ` — ${result.unmatched} unmatched` : ""}.
        </p>
      )}
      {error && <p className="text-xs font-semibold text-status-risk">{error}</p>}
    </form>
  );
}
