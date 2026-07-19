import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { DocumentStorage } from "./index";

/**
 * Dev-only storage driver: writes to local disk and issues an HMAC-signed,
 * time-limited URL served through app/api/documents/[...key]/route.ts — a
 * stand-in for S3 presigned URLs so the "signed URL, not a public link"
 * behavior from spec §12 is real even without a cloud bucket. Swap to
 * S3DocumentStorage (DOCUMENT_STORAGE_DRIVER=s3) for production.
 */
export class LocalDocumentStorage implements DocumentStorage {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.env.DOCUMENT_STORAGE_LOCAL_DIR ?? "./.data/documents");
  }

  private resolvePath(key: string): string {
    const resolved = path.resolve(this.baseDir, key);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error("Invalid storage key: path traversal attempt");
    }
    return resolved;
  }

  async put(key: string, data: Buffer, _mimeType?: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolvePath(key)).catch(() => undefined);
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const token = signLocalDocumentToken(key, expiresAt);
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    // key segments are path components (e.g. "properties/p1/documents/d1/file.pdf") —
    // encode each segment individually so slashes survive as the catch-all route's segments.
    const encodedPath = key.split("/").map(encodeURIComponent).join("/");
    return `${base}/api/documents/${encodedPath}?expires=${expiresAt}&token=${token}`;
  }
}

function getLocalSigningSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY is not set (reused as the local signed-URL secret)");
  return secret;
}

export function signLocalDocumentToken(key: string, expiresAt: number): string {
  return createHmac("sha256", getLocalSigningSecret())
    .update(`${key}:${expiresAt}`)
    .digest("hex");
}

export function verifyLocalDocumentToken(key: string, expiresAt: number, token: string): boolean {
  if (Date.now() > expiresAt) return false;
  const expected = Buffer.from(signLocalDocumentToken(key, expiresAt));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
