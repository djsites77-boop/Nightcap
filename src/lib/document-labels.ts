import type { DocumentType } from "@/generated/prisma/client";

const TYPE_LABELS: Record<DocumentType, string> = {
  fire_safety_cert: "Fire safety certificate",
  insurance: "Insurance",
  floor_plan: "Floor plan",
  registration: "Registration / licence",
  receipt: "Receipt",
  other: "Other",
};

export function documentTypeLabel(docType: DocumentType | string, label?: string | null): string {
  const custom = label?.trim();
  if (custom) return custom;
  return TYPE_LABELS[docType as DocumentType] ?? String(docType).replace(/_/g, " ");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
