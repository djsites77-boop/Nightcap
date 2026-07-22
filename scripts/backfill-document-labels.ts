import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { documentTypeLabel, inferDocTypeFromFileName } from "../src/lib/document-labels";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const docs = await prisma.document.findMany();
  for (const d of docs) {
    if (d.label) continue;
    const inferred = inferDocTypeFromFileName(d.fileName);
    const label = d.docType === "other" ? inferred.label : documentTypeLabel(d.docType);
    await prisma.document.update({ where: { id: d.id }, data: { label } });
    console.log(`${d.fileName} → ${label}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
