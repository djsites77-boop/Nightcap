"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

const INVENTORY_CATEGORIES = [
  "appliance",
  "furniture",
  "electronics",
  "linens_bedding",
  "kitchenware",
  "safety_equipment",
  "outdoor",
  "other",
] as const;
const INVENTORY_CONDITIONS = ["excellent", "good", "fair", "poor", "damaged"] as const;
const INVENTORY_STATUSES = ["active", "needs_repair", "replaced", "removed"] as const;

async function assertOwnsProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== userId) throw new Error("Not authorized");
  return property;
}

const createAssetSchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.enum(INVENTORY_CATEGORIES),
  condition: z.enum(INVENTORY_CONDITIONS),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(200).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().nonnegative().optional(),
  warrantyExpiryDate: z.string().optional(),
  locationInProperty: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createInventoryAsset(formData: FormData) {
  const session = await requireSession();
  const parsed = createAssetSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    category: formData.get("category"),
    condition: formData.get("condition"),
    brand: formData.get("brand") || undefined,
    model: formData.get("model") || undefined,
    serialNumber: formData.get("serialNumber") || undefined,
    purchaseDate: formData.get("purchaseDate") || undefined,
    purchasePrice: formData.get("purchasePrice") || undefined,
    warrantyExpiryDate: formData.get("warrantyExpiryDate") || undefined,
    locationInProperty: formData.get("locationInProperty") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  await assertOwnsProperty(parsed.data.propertyId, session.user.id);

  await prisma.inventoryAsset.create({
    data: {
      propertyId: parsed.data.propertyId,
      name: parsed.data.name,
      category: parsed.data.category,
      condition: parsed.data.condition,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      serialNumber: parsed.data.serialNumber || null,
      purchaseDate: parsed.data.purchaseDate ? new Date(`${parsed.data.purchaseDate}T00:00:00Z`) : null,
      purchasePriceCents:
        parsed.data.purchasePrice != null ? Math.round(parsed.data.purchasePrice * 100) : null,
      warrantyExpiryDate: parsed.data.warrantyExpiryDate
        ? new Date(`${parsed.data.warrantyExpiryDate}T00:00:00Z`)
        : null,
      locationInProperty: parsed.data.locationInProperty || null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
}

const updateStatusSchema = z.object({
  assetId: z.string().min(1),
  condition: z.enum(INVENTORY_CONDITIONS).optional(),
  status: z.enum(INVENTORY_STATUSES).optional(),
});

/** Quick inline update of an asset's condition/status (e.g. after a damage report). */
export async function updateInventoryAssetStatus(formData: FormData) {
  const session = await requireSession();
  const parsed = updateStatusSchema.safeParse({
    assetId: formData.get("assetId"),
    condition: formData.get("condition") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const asset = await prisma.inventoryAsset.findUniqueOrThrow({ where: { id: parsed.data.assetId } });
  await assertOwnsProperty(asset.propertyId, session.user.id);

  await prisma.inventoryAsset.update({
    where: { id: asset.id },
    data: {
      ...(parsed.data.condition ? { condition: parsed.data.condition } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
  });

  revalidatePath(`/properties/${asset.propertyId}`);
}

export async function deleteInventoryAsset(assetId: string) {
  const session = await requireSession();
  const asset = await prisma.inventoryAsset.findUniqueOrThrow({ where: { id: assetId } });
  await assertOwnsProperty(asset.propertyId, session.user.id);

  await prisma.inventoryAsset.delete({ where: { id: assetId } });
  revalidatePath(`/properties/${asset.propertyId}`);
}
