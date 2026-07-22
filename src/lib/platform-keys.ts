import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret, lastFour } from "@/lib/crypto";

/** Catalog of platform secrets managed under /admin/keys. */
export const PLATFORM_API_KEY_DEFS = [
  {
    keyName: "google_maps",
    label: "Google Maps Platform",
    description:
      "Google map with pin on property pages (Maps Embed API — free) and list thumbnails (Maps Static API — free tier then pay-as-you-go). Geocoding stays on free OpenStreetMap Nominatim.",
  },
  {
    keyName: "anthropic",
    label: "Anthropic (Claude)",
    description:
      "Powers AI receipt scanning, document auto-detect, and compliance-rule suggestions. Falls back to ANTHROPIC_API_KEY in .env if unset here.",
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

/** Claude API key: DB (admin Keys & APIs) first, then .env. */
export async function resolveAnthropicApiKey(): Promise<string | null> {
  try {
    const fromDb = await getPlatformApiKeyPlaintext("anthropic");
    if (fromDb?.trim()) return fromDb.trim();
  } catch {
    // ENCRYPTION_KEY / DB unavailable — try env
  }
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
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
