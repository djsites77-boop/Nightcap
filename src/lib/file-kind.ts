/**
 * File kind helpers for UI icons — safe on client and server.
 */

export type FileKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "webp"
  | "gif"
  | "heic"
  | "csv"
  | "doc"
  | "docx"
  | "xls"
  | "xlsx"
  | "image"
  | "other";

export function fileKindFrom(mimeType: string, fileName: string): FileKind {
  const mime = (mimeType || "").toLowerCase();
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime === "image/png" || ext === "png") return "png";
  if (mime === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "jpeg";
  if (mime === "image/webp" || ext === "webp") return "webp";
  if (mime === "image/gif" || ext === "gif") return "gif";
  if (mime.includes("heic") || mime.includes("heif") || ext === "heic" || ext === "heif") return "heic";
  if (mime === "text/csv" || ext === "csv") return "csv";
  if (
    mime.includes("wordprocessingml") ||
    ext === "docx"
  ) {
    return "docx";
  }
  if (mime === "application/msword" || ext === "doc") return "doc";
  if (
    mime.includes("spreadsheetml") ||
    ext === "xlsx"
  ) {
    return "xlsx";
  }
  if (mime === "application/vnd.ms-excel" || ext === "xls") return "xls";
  if (mime.startsWith("image/")) return "image";
  return "other";
}

export function fileKindLabel(kind: FileKind): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "png":
      return "PNG";
    case "jpeg":
      return "JPG";
    case "webp":
      return "WEBP";
    case "gif":
      return "GIF";
    case "heic":
      return "HEIC";
    case "csv":
      return "CSV";
    case "doc":
      return "DOC";
    case "docx":
      return "DOCX";
    case "xls":
      return "XLS";
    case "xlsx":
      return "XLSX";
    case "image":
      return "IMG";
    default:
      return "FILE";
  }
}
