import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret, lastFour } from "@/lib/crypto";

/** Catalog of platform secrets managed under /admin/keys. */
export const PLATFORM_API_KEY_DEFS = [
  {
    keyName: "google_maps",
    label: "Google Maps Platform",
    description:
      "Used for property map thumbnails (Maps Static API). Address geocoding stays on free OpenStreetMap Nominatim.",
  },
] as const;

export type PlatformApiKeyName = (typeof PLATFORM_API_KEY_DEFS)[number]["keyName"];

export function isPlatformApiKeyName(value: string): value is PlatformApiKeyName {
  return PLATFORM_API_KEY_DEFS.some((d) => d.keyName === value);
}

export async function getPlatformApiKeyPlaintext(keyName: PlatformApiKeyName): Promise<string | null> {
  const row = await prisma.platformApiKey.findUnique({ where: { keyName } });
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv });
}

export async function upsertPlatformApiKeyRecord(
  keyName: PlatformApiKeyName,
  plaintext: string,
  label: string
) {
  const trimmed = plaintext.trim();
  if (!trimmed) throw new Error("API key cannot be empty");
  const { ciphertext, iv } = encryptSecret(trimmed);
  const four = lastFour(trimmed);

  return prisma.platformApiKey.upsert({
    where: { keyName },
    create: { keyName, label, ciphertext, iv, lastFour: four },
    update: { label, ciphertext, iv, lastFour: four },
  });
}

export async function deletePlatformApiKeyRecord(keyName: PlatformApiKeyName) {
  await prisma.platformApiKey.deleteMany({ where: { keyName } });
}
