import Link from "next/link";
import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileTypeIcon } from "@/components/file-type-icon";
import { ViewDocumentButton } from "@/components/property-detail/view-document-button";
import { documentTypeLabel, formatFileSize } from "@/lib/document-labels";
import { fileKindFrom, fileKindLabel } from "@/lib/file-kind";
import { cn } from "@/lib/utils";

export type DocumentListItemData = {
  id: string;
  docType: string;
  label: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date | string;
  expiryDate: Date | string | null;
  property: { id: string; nickname: string } | null;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

export function DocumentListItem({
  doc,
  showProperty = true,
  className,
}: {
  doc: DocumentListItemData;
  showProperty?: boolean;
  className?: string;
}) {
  const now = new Date();
  const expiry = asDate(doc.expiryDate);
  const uploaded = asDate(doc.uploadedAt) ?? now;
  const expired = expiry != null && expiry < now;
  const soon =
    expiry != null && !expired && (expiry.getTime() - now.getTime()) / 86400000 <= 30;
  const title = documentTypeLabel(doc.docType, doc.label);
  const kind = fileKindFrom(doc.mimeType, doc.fileName);
  const kindLabel = fileKindLabel(kind);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-surface/60 p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center sm:gap-4",
        className
      )}
    >
      <FileTypeIcon mimeType={doc.mimeType} fileName={doc.fileName} size="lg" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-extrabold text-foreground">{title}</p>
          <span className="rounded-md bg-surface-alt px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            {kindLabel}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-foreground/90" title={doc.fileName}>
          {doc.fileName}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted-foreground">
          <span>{formatFileSize(doc.sizeBytes)}</span>
          <span aria-hidden>·</span>
          <span>Uploaded {uploaded.toLocaleDateString("en-CA")}</span>
          {showProperty ? (
            <>
              <span aria-hidden>·</span>
              {doc.property ? (
                <Link
                  href={`/properties/${doc.property.id}?tab=documents`}
                  className="inline-flex items-center gap-1 text-brand hover:underline dark:text-accent"
                >
                  <Building2 className="size-3" strokeWidth={2} />
                  {doc.property.nickname}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3 opacity-60" strokeWidth={2} />
                  General (not tied to a listing)
                </span>
              )}
            </>
          ) : null}
        </div>
        <div className="pt-0.5">
          {expiry ? (
            <Badge variant={expired ? "risk" : soon ? "warning" : "ok"}>
              {expired
                ? `Expired ${expiry.toLocaleDateString("en-CA")}`
                : soon
                  ? `Expires ${expiry.toLocaleDateString("en-CA")}`
                  : `Valid until ${expiry.toLocaleDateString("en-CA")}`}
            </Badge>
          ) : (
            <Badge variant="neutral" dot={false}>
              No expiry
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 sm:self-center">
        <ViewDocumentButton documentId={doc.id} />
      </div>
    </div>
  );
}
