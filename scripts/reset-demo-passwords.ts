import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await hashPassword("1");

  for (const email of ["dana@queensthosting.ca", "admin@nightcap.app"]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`skip (missing): ${email}`);
      continue;
    }
    const updated = await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: passwordHash },
    });
    console.log(`reset ${email} → password "1" (${updated.count} account row(s))`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
