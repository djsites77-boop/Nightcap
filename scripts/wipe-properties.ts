/**
 * Wipe all property-related seed/demo data so `pnpm db:seed` can reload cleanly.
 * Keeps users, municipalities, tiers, and subscriptions.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const before = await prisma.property.count();
  console.log(`Properties before wipe: ${before}`);

  // Children first if cascade isn't enough for every table.
  const deleted = await prisma.property.deleteMany({});
  console.log(`Deleted properties: ${deleted.count}`);

  // Local document uploads for properties
  const docsRoot = path.join(process.cwd(), ".data", "documents", "properties");
  try {
    await rm(docsRoot, { recursive: true, force: true });
    console.log(`Removed ${docsRoot}`);
  } catch {
    console.log("No local property documents folder to remove");
  }

  const after = await prisma.property.count();
  console.log(`Properties after wipe: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
