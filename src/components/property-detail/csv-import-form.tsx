"use client";

import { useRef, useState, useTransition } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { importTransactionCsv, type CsvImportResult } from "@/app/actions/csv-import";

export function CsvImportForm({ propertyId }: { propertyId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface-alt p-3"
      action={(formData) => {
        setError(null);
        setResult(null);
        startTransition(async () => {
          try {
            const res = await importTransactionCsv(propertyId, formData);
            setResult(res);
            formRef.current?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Import failed");
          }
        });
      }}
    >
      <UploadCloud className="size-4 text-subtle-foreground" />
      <NativeSelect
        name="platform"
        defaultValue="airbnb"
        className="h-9 min-h-9 w-auto rounded-xl px-2.5 pr-8 text-xs"
      >
        <option value="airbnb">Airbnb export</option>
        <option value="vrbo">VRBO export</option>
      </NativeSelect>
      <input
        type="file"
        name="csv"
        accept=".csv,text/csv"
        required
        className="flex-1 text-xs text-muted-foreground file:mr-2 file:rounded-xl file:border-0 file:bg-surface-sunken file:px-2.5 file:py-1.5 file:text-xs file:font-semibold"
      />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "Importing…" : "Backfill revenue from CSV"}
      </Button>
      {result && (
        <span className="w-full text-xs text-status-ok">
          Matched {result.matched} of {result.totalRows} rows to existing bookings
          {result.unmatched > 0 && ` — ${result.unmatched} unmatched (no booking on that date)`}.
        </span>
      )}
      {error && <span className="w-full text-xs text-status-risk">{error}</span>}
    </form>
  );
}
