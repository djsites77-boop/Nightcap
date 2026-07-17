import { LocalDocumentStorage } from "./local-driver";
import { S3DocumentStorage } from "./s3-driver";

/**
 * Document storage abstraction (spec §12): Document.file_url is a private
 * object-storage key, never a public URL. Signed, short-lived URLs are
 * minted on request and scoped to the requesting user's own properties —
 * enforced by the caller (see app/api/documents/[key]/route.ts) checking
 * property ownership *before* calling getSignedUrl.
 */
export interface DocumentStorage {
  put(key: string, data: Buffer, mimeType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

let instance: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (instance) return instance;

  const driver = process.env.DOCUMENT_STORAGE_DRIVER ?? "local";
  instance = driver === "s3" ? new S3DocumentStorage() : new LocalDocumentStorage();
  return instance;
}

export function buildDocumentStorageKey(propertyId: string, docId: string, fileName: string): string {
  // propertyId in the key path means a signed URL for one property's
  // documents can never be reused to address another property's files even
  // if an attacker guesses a docId.
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `properties/${propertyId}/documents/${docId}/${safeName}`;
}
