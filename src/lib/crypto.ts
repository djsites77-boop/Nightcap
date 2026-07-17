import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM helpers for encrypting sensitive values at rest — the iCal URL
 * (spec §12: "effectively a bearer credential") and PMS OAuth tokens. Not a
 * general-purpose crypto module; scoped to exactly this use case.
 *
 * ENCRYPTION_KEY must be 32 bytes, hex-encoded (64 hex chars). Generate a
 * real one for production with: openssl rand -hex 32
 */

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
  }
  return key;
}

export interface EncryptedValue {
  /** base64: iv (12 bytes) + authTag (16 bytes) + ciphertext, all in one field for storage convenience. */
  ciphertext: string;
  /** base64 iv, kept separately too for callers that store it in its own column. */
  iv: string;
}

export function encryptSecret(plaintext: string): EncryptedValue {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([authTag, ciphertext]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSecret(encrypted: EncryptedValue): string {
  const key = getKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const combined = Buffer.from(encrypted.ciphertext, "base64");
  const authTag = combined.subarray(0, 16);
  const ciphertext = combined.subarray(16);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Last 4 chars of a URL/token for masked display — never the value itself. */
export function lastFour(value: string): string {
  return value.slice(-4);
}
