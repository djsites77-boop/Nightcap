import { prisma } from "@/lib/db";
import { PLATFORM_API_KEY_DEFS } from "@/lib/platform-keys";
import { PageHeader } from "@/components/ui/page-header";
import { KeysManager } from "./keys-manager";

export default async function AdminKeysPage() {
  const stored = await prisma.platformApiKey.findMany();
  const byName = new Map(stored.map((r) => [r.keyName, r]));

  const keys = PLATFORM_API_KEY_DEFS.map((def) => {
    const row = byName.get(def.keyName);
    return {
      keyName: def.keyName,
      label: def.label,
      description: def.description,
      configured: Boolean(row),
      lastFour: row?.lastFour ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Keys & APIs"
        description="Encrypted platform credentials. Keys are masked by default — viewing the full value requires your account password."
      />
      <KeysManager keys={keys} />
    </div>
  );
}
