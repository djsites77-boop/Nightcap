import "server-only";
import { prisma } from "@/lib/db";

/** Keep Property.roomsOffered in sync with the sum of child RentalUnits. */
export async function refreshPropertyRoomsOffered(propertyId: string): Promise<number> {
  const units = await prisma.rentalUnit.findMany({
    where: { propertyId },
    select: { roomsOffered: true },
  });
  const total = units.reduce((sum, u) => sum + u.roomsOffered, 0);
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    select: { unitType: true },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      roomsOffered: property.unitType === "partial_unit" ? total : null,
    },
  });
  return total;
}

/**
 * Backfill Room 1…N for older partial properties that only had roomsOffered
 * on the Property row (pre multi-unit UI).
 */
export async function ensurePartialUnitRooms(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { rentalUnits: { select: { id: true } } },
  });
  if (!property || property.unitType !== "partial_unit") return;
  if (property.rentalUnits.length > 0) return;

  const count = Math.max(1, property.roomsOffered ?? 1);
  for (let i = 1; i <= count; i++) {
    await prisma.rentalUnit.create({
      data: {
        propertyId,
        name: `Room ${i}`,
        roomsOffered: 1,
      },
    });
  }
  await refreshPropertyRoomsOffered(propertyId);
}

/** Resolve the owning Property for a calendar connection (property- or unit-scoped). */
export async function resolveCalendarConnectionOwner(connectionId: string) {
  const connection = await prisma.calendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: {
      property: { select: { id: true, userId: true } },
      rentalUnit: {
        include: { property: { select: { id: true, userId: true } } },
      },
    },
  });

  const property = connection.property ?? connection.rentalUnit?.property ?? null;
  if (!property) {
    throw new Error("Calendar connection is not linked to a property or room.");
  }

  return { connection, property };
}
