export function documentTypeLabel(docType: string, customLabel?: string | null): string {
  if (customLabel) return customLabel;

  const labels: Record<string, string> = {
    fire_safety_cert: "Fire safety certificate",
    insurance: "Insurance policy",
    floor_plan: "Floor plan",
    registration: "Registration",
    receipt: "Receipt",
    other: "Document",
  };

  return labels[docType] || "Document";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}
