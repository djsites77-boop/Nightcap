/**
 * Upload allowlist + light content sniffing.
 * Not a virus scanner — blocks risky types/extensions and mismatches so
 * hosts can't upload executables or spoofed files as "PDFs".
 */

import { MAX_UPLOAD_BYTES } from "@/lib/upload-accept";

export { DOCUMENT_ACCEPT, RECEIPT_ACCEPT, MAX_UPLOAD_BYTES } from "@/lib/upload-accept";

const ALLOWED_EXT = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "heic",
  "heif",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
]);

const BLOCKED_EXT = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "msi",
  "dll",
  "ps1",
  "sh",
  "bash",
  "js",
  "mjs",
  "cjs",
  "ts",
  "jsx",
  "tsx",
  "html",
  "htm",
  "svg",
  "xml",
  "php",
  "asp",
  "aspx",
  "jsp",
  "jar",
  "apk",
  "dmg",
  "iso",
  "pkg",
  "vbs",
  "wsf",
  "hta",
  "reg",
  "lnk",
  "wasm",
]);

type AllowedKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "webp"
  | "gif"
  | "heic"
  | "csv"
  | "docx"
  | "xlsx"
  | "doc"
  | "xls";

const EXT_TO_KIND: Record<string, AllowedKind> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  gif: "gif",
  heic: "heic",
  heif: "heic",
  csv: "csv",
  docx: "docx",
  xlsx: "xlsx",
  doc: "doc",
  xls: "xls",
};

const KIND_MIME: Record<AllowedKind, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
};

export type SafeUploadResult = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AllowedKind;
  buffer: Buffer;
};

function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const parts = base.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

function hasBlockedDoubleExt(name: string): boolean {
  const base = name.split(/[/\\]/).pop() ?? name;
  const parts = base.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 3) return false;
  // e.g. invoice.pdf.exe or malware.pdf.js
  return parts.slice(0, -1).some((p) => BLOCKED_EXT.has(p));
}

function sniffKind(buf: Buffer): AllowedKind | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 4).toString("ascii") === "%PDF") return "pdf";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "gif";
  }
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  // HEIC/HEIF brand in ftyp box
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (["heic", "heif", "mif1", "msf1"].includes(brand)) return "heic";
  }
  // ZIP-based Office (docx/xlsx) — PK\x03\x04
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    const asText = buf.subarray(0, Math.min(buf.length, 2000)).toString("latin1");
    if (asText.includes("word/")) return "docx";
    if (asText.includes("xl/")) return "xlsx";
    return null;
  }
  // Legacy OLE Compound (doc/xls)
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    return "doc"; // could be xls; extension decides below
  }
  return null;
}

function looksLikeCsv(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 4096)).toString("utf8");
  if (sample.includes("\u0000")) return false;
  const lines = sample.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) return false;
  const commas = lines.filter((l) => l.includes(",")).length;
  return commas >= Math.ceil(lines.length / 2);
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "file";
}

/**
 * Validate an uploaded File for document/receipt storage.
 * Throws a user-facing Error on rejection.
 */
export async function assertSafeUpload(file: File): Promise<SafeUploadResult> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File must be under 8MB.");
  }

  const rawName = file.name || "file";
  if (hasBlockedDoubleExt(rawName)) {
    throw new Error("That file type isn’t allowed.");
  }

  const ext = extensionOf(rawName);
  if (!ext || BLOCKED_EXT.has(ext)) {
    throw new Error("That file type isn’t allowed. Use PDF, image, CSV, Word, or Excel.");
  }
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("That file type isn’t allowed. Use PDF, image, CSV, Word, or Excel.");
  }

  const expectedKind = EXT_TO_KIND[ext];
  if (!expectedKind) {
    throw new Error("That file type isn’t allowed.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffKind(buffer);

  let kind = expectedKind;
  if (expectedKind === "csv") {
    if (sniffed) {
      throw new Error("This doesn’t look like a CSV — upload was blocked.");
    }
    if (!looksLikeCsv(buffer)) {
      throw new Error("This doesn’t look like a CSV — upload was blocked.");
    }
  } else if (expectedKind === "doc" || expectedKind === "xls") {
    // OLE compound — sniff can't always tell doc vs xls
    if (sniffed && sniffed !== "doc" && sniffed !== "xls") {
      throw new Error("File contents don’t match the extension — upload was blocked.");
    }
  } else if (expectedKind === "docx" || expectedKind === "xlsx") {
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (sniffed === expectedKind || (isZip && (sniffed === null || sniffed === expectedKind))) {
      kind = expectedKind;
    } else if (sniffed && sniffed !== expectedKind) {
      throw new Error("File contents don’t match the extension — upload was blocked.");
    } else if (!isZip) {
      throw new Error("File contents don’t match the extension — upload was blocked.");
    }
  } else {
    // Images + PDF — require magic bytes to match
    if (!sniffed) {
      throw new Error("File contents don’t match the extension — upload was blocked.");
    }
    if (sniffed !== expectedKind) {
      throw new Error("File contents don’t match the extension — upload was blocked.");
    }
    kind = sniffed;
  }

  return {
    fileName: sanitizeFileName(rawName),
    mimeType: KIND_MIME[kind],
    sizeBytes: file.size,
    kind,
    buffer,
  };
}
