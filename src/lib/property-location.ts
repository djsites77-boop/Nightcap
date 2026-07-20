import "server-only";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geo";

/** Backfill lat/lng from address when missing (best-effort). */
export async function ensurePropertyLocation(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, address: true, latitude: true, longitude: true },
  });
  if (!property) return;
  if (property.latitude != null && property.longitude != null) return;

  const coords = await geocodeAddress(property.address);
  if (!coords) return;

  await prisma.property.update({
    where: { id: property.id },
    data: { latitude: coords.latitude, longitude: coords.longitude },
  });
}
