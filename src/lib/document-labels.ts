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

export function humanizeFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!stem) return fileName;
  return stem.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 120);
}

/** Best-effort type from file name when AI isn't available. */
export function inferDocTypeFromFileName(fileName: string): {
  docType: DocumentType;
  label: string;
} {
  const n = fileName.toLowerCase();
  if (n.includes("insur") || n.includes("liability")) {
    return { docType: "insurance", label: "Insurance" };
  }
  if (n.includes("fire") || n.includes("safety")) {
    return { docType: "fire_safety_cert", label: "Fire safety certificate" };
  }
  if (n.includes("floor")) {
    return { docType: "floor_plan", label: "Floor plan" };
  }
  if (n.includes("registr") || n.includes("licen") || n.includes("permit")) {
    return { docType: "registration", label: "Registration / licence" };
  }
  if (n.includes("receipt") || n.includes("invoice")) {
    return { docType: "receipt", label: "Receipt" };
  }
  return { docType: "other", label: humanizeFileName(fileName) };
}
