import { FileText, FileImage, FileSpreadsheet, FileType2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileKindFrom, fileKindLabel, type FileKind } from "@/lib/file-kind";

const KIND_STYLE: Record<
  FileKind,
  { shell: string; badge: string; Icon: typeof FileText }
> = {
  pdf: {
    shell: "bg-[#fde8e8] text-[#c4282a] dark:bg-[#3a1a1c] dark:text-[#ff8a8d]",
    badge: "bg-[#e5484d] text-white",
    Icon: FileText,
  },
  png: {
    shell: "bg-[#e5f6ed] text-[#15803d] dark:bg-[#14301f] dark:text-[#4ade80]",
    badge: "bg-[#16a34a] text-white",
    Icon: FileImage,
  },
  jpeg: {
    shell: "bg-[#fff4e5] text-[#b45309] dark:bg-[#3a2a12] dark:text-[#fbbf24]",
    badge: "bg-[#e89a3c] text-white",
    Icon: FileImage,
  },
  webp: {
    shell: "bg-[#e8f0fe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
    badge: "bg-[#3b82f6] text-white",
    Icon: FileImage,
  },
  gif: {
    shell: "bg-[#f3e8ff] text-[#7e22ce] dark:bg-[#2a1a3a] dark:text-[#d8b4fe]",
    badge: "bg-[#9333ea] text-white",
    Icon: FileImage,
  },
  heic: {
    shell: "bg-brand-soft text-brand",
    badge: "bg-brand text-brand-foreground",
    Icon: FileImage,
  },
  csv: {
    shell: "bg-[#e5f6ed] text-[#15803d] dark:bg-[#14301f] dark:text-[#4ade80]",
    badge: "bg-[#16a34a] text-white",
    Icon: FileSpreadsheet,
  },
  xls: {
    shell: "bg-[#e5f6ed] text-[#15803d] dark:bg-[#14301f] dark:text-[#4ade80]",
    badge: "bg-[#15803d] text-white",
    Icon: FileSpreadsheet,
  },
  xlsx: {
    shell: "bg-[#e5f6ed] text-[#15803d] dark:bg-[#14301f] dark:text-[#4ade80]",
    badge: "bg-[#15803d] text-white",
    Icon: FileSpreadsheet,
  },
  doc: {
    shell: "bg-[#e8f0fe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
    badge: "bg-[#2563eb] text-white",
    Icon: FileType2,
  },
  docx: {
    shell: "bg-[#e8f0fe] text-[#1d4ed8] dark:bg-[#1a2744] dark:text-[#93c5fd]",
    badge: "bg-[#2563eb] text-white",
    Icon: FileType2,
  },
  image: {
    shell: "bg-brand-soft text-brand",
    badge: "bg-brand text-brand-foreground",
    Icon: FileImage,
  },
  other: {
    shell: "bg-surface-alt text-muted-foreground",
    badge: "bg-muted-foreground text-white",
    Icon: FileText,
  },
};

/** Distinctive file-type tile — PDF / PNG / etc., not a generic paper icon. */
export function FileTypeIcon({
  mimeType,
  fileName,
  className,
  size = "md",
}: {
  mimeType: string;
  fileName: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const kind = fileKindFrom(mimeType, fileName);
  const { shell, badge, Icon } = KIND_STYLE[kind];
  const label = fileKindLabel(kind);
  const box =
    size === "lg" ? "size-14 rounded-2xl" : size === "sm" ? "size-10 rounded-xl" : "size-12 rounded-2xl";
  const iconSize = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  const badgeText = size === "sm" ? "text-[8px] px-1" : "text-[9px] px-1.5";

  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center", box, shell, className)}
      title={label}
      aria-label={`${label} file`}
    >
      <Icon className={cn(iconSize, "mb-1")} strokeWidth={1.75} aria-hidden />
      <span
        className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded font-black uppercase tracking-wide shadow-sm",
          badgeText,
          badge
        )}
      >
        {label}
      </span>
    </div>
  );
}
