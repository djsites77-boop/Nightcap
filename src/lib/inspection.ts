import "server-only";
import { prisma } from "@/lib/db";

/** Default inspection checklist keys (MVP). Extensible later via ComplianceRule per municipality. */
export const DEFAULT_INSPECTION_ITEM_KEYS = [
  "smoke_detector",
  "co_detector",
  "egress",
  "occupancy_posting",
] as const;

export async function ensureInspectionChecklist(propertyId: string) {
  for (const itemKey of DEFAULT_INSPECTION_ITEM_KEYS) {
    await prisma.inspectionItem.upsert({
      where: { propertyId_itemKey: { propertyId, itemKey } },
      create: { propertyId, itemKey },
      update: {},
    });
  }
}
