/**
 * One-shot upsert for a platform API key (encrypted at rest).
 *
 * Usage:
 *   GOOGLE_MAPS_API_KEY="AIza…" pnpm exec tsx scripts/upsert-platform-key.ts google_maps
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { encryptSecret, lastFour } from "../src/lib/crypto";

const KEY_LABELS: Record<string, string> = {
  google_maps: "Google Maps Platform",
};

async function main() {
  const keyName = process.argv[2];
  if (!keyName || !(keyName in KEY_LABELS)) {
    console.error(`Usage: tsx scripts/upsert-platform-key.ts <${Object.keys(KEY_LABELS).join("|")}>`);
    process.exit(1);
  }

  const envName = keyName === "google_maps" ? "GOOGLE_MAPS_API_KEY" : `${keyName.toUpperCase()}_API_KEY`;
  const plaintext = process.env[envName]?.trim();
  if (!plaintext) {
    console.error(`Set ${envName} in the environment (do not commit the value).`);
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const { ciphertext, iv } = encryptSecret(plaintext);
  const label = KEY_LABELS[keyName]!;

  await prisma.platformApiKey.upsert({
    where: { keyName },
    create: { keyName, label, ciphertext, iv, lastFour: lastFour(plaintext) },
    update: { label, ciphertext, iv, lastFour: lastFour(plaintext) },
  });

  console.log(`Saved ${keyName} (···${lastFour(plaintext)})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
