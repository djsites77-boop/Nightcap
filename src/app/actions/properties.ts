"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { encryptSecret, lastFour } from "@/lib/crypto";
import { syncCalendarConnection } from "@/lib/ical-sync";
import { recomputeNightTally } from "@/lib/night-tally";
import { ensureSubscription } from "@/lib/subscription";
import {
  resolvePartialUnitBedroomCap,
  type ComplianceRuleRow,
} from "@/lib/compliance/rules";
import { ensureInspectionChecklist } from "@/lib/inspection";
import { ensureMatPeriods } from "@/lib/mat-ledger";
import { geocodeAddress } from "@/lib/geo";
import { validatePartialUnitCompliance } from "@/lib/compliance-validator";
import { refreshPropertyRoomsOffered } from "@/lib/rental-units";
import { revalidatePath } from "next/cache";

const createPropertySchema = z
  .object({
    nickname: z.string().trim().min(1, "Nickname is required"),
    address: z.string().trim().min(1, "Address is required"),
    municipalityId: z.string().min(1, "Choose a municipality"),
    unitType: z.enum(["entire_home", "partial_unit"]),
    bedroomCount: z.coerce.number().int().min(1, "Must have at least 1 bedroom"),
    roomsOffered: z.coerce.number().int().min(0).optional(),
  })
  .refine(
    (data) => data.unitType !== "partial_unit" || data.roomsOffered !== undefined,
    { message: "Rooms offered is required for a partial-unit listing", path: ["roomsOffered"] }
  );

export async function createProperty(formData: FormData) {
  const session = await requireSession();

  const parsed = createPropertySchema.safeParse({
    nickname: formData.get("nickname"),
    address: formData.get("address"),
    municipalityId: formData.get("municipalityId"),
    unitType: formData.get("unitType"),
    bedroomCount: formData.get("bedroomCount"),
    roomsOffered: formData.get("roomsOffered") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const data = parsed.data;

  const municipality = await prisma.municipality.findUniqueOrThrow({ where: { id: data.municipalityId } });
  if (!municipality.active) {
    throw new Error(
      `${municipality.name} isn't enabled yet — ask a platform admin to enable it under Jurisdictions.`
    );
  }

  const subscription = await ensureSubscription(session.user.id);
  const limit = subscription.propertyLimit;
  if (limit !== null) {
    const currentCount = await prisma.property.count({
      where: { userId: session.user.id, archivedAt: null },
    });
    if (currentCount >= limit) {
      const tierLabel = subscription.tier.name;
      throw new Error(
        `Your ${tierLabel} plan is limited to ${limit} ${limit === 1 ? "property" : "properties"}. Upgrade to add more.`
      );
    }
  }

  let roomsOffered: number | null = null;
  if (data.unitType === "partial_unit") {
    const offered = data.roomsOffered ?? 0;
    const rules = await prisma.complianceRule.findMany({
      where: { municipalityId: data.municipalityId, ruleType: "partial_unit_bedroom_cap" },
      select: { ruleType: true, unitType: true, value: true, effectiveDate: true },
    });
    const ruleRows: ComplianceRuleRow[] = rules.map((r) => ({
      ruleType: r.ruleType,
      unitType: r.unitType,
      value: r.value,
      effectiveDate: r.effectiveDate,
    }));
    const cap = resolvePartialUnitBedroomCap(ruleRows, data.bedroomCount, new Date());
    if (cap == null) {
      throw new Error("Bedroom-cap rules are not configured for this municipality yet.");
    }
    if (offered < 1) {
      throw new Error("Rooms offered must be at least 1 for a partial-unit listing.");
    }
    // Soft enforcement: allow save even if exceeding cap, but log violation
    roomsOffered = offered;
  }

  const coords = await geocodeAddress(data.address);

  const property = await prisma.property.create({
    data: {
      userId: session.user.id,
      nickname: data.nickname,
      address: data.address,
      municipalityId: data.municipalityId,
      unitType: data.unitType,
      bedroomCount: data.bedroomCount,
      roomsOffered,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    },
  });

  await ensureInspectionChecklist(property.id);
  await ensureMatPeriods(property.id, new Date().getUTCFullYear());

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: property.id,
      action: "property_created",
      payload: {
        nickname: property.nickname,
        unitType: property.unitType,
        bedroomCount: property.bedroomCount,
        roomsOffered: property.roomsOffered,
      },
    },
  });

  await recomputeNightTally(property.id);

  // Partial homes: one RentalUnit per separate STR listing (Room 1, Room 2, …).
  // Each unit gets its own Airbnb/VRBO calendar during connect.
  if (data.unitType === "partial_unit" && roomsOffered) {
    for (let i = 1; i <= roomsOffered; i++) {
      await prisma.rentalUnit.create({
        data: {
          propertyId: property.id,
          name: roomsOffered === 1 ? "Room 1" : `Room ${i}`,
          roomsOffered: 1,
        },
      });
    }

    const validation = await validatePartialUnitCompliance(property.id);
    if (!validation.isCompliant) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          propertyId: property.id,
          action: "compliance_violation_detected",
          payload: { violations: validation.violations },
        },
      });
    }
  }

  redirect(`/properties/${property.id}/connect-calendar`);
}

const connectCalendarSchema = z.object({
  platform: z.enum(["airbnb", "vrbo", "direct"]),
  icalUrl: z.string().trim().url("Enter a valid iCal URL"),
  rentalUnitId: z.string().optional(),
});

export async function connectCalendar(propertyId: string, formData: FormData) {
  const session = await requireSession();
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { rentalUnits: { select: { id: true } } },
  });
  if (property.userId !== session.user.id) throw new Error("Not authorized");

  const parsed = connectCalendarSchema.safeParse({
    platform: formData.get("platform"),
    icalUrl: formData.get("icalUrl"),
    rentalUnitId: formData.get("rentalUnitId") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  let rentalUnitId: string | null = null;
  let connectionPropertyId: string | null = propertyId;

  if (property.unitType === "partial_unit") {
    const unitId = parsed.data.rentalUnitId;
    if (!unitId) {
      throw new Error("Pick which room listing this calendar belongs to.");
    }
    if (!property.rentalUnits.some((u) => u.id === unitId)) {
      throw new Error("That room isn’t part of this property.");
    }
    rentalUnitId = unitId;
    connectionPropertyId = null; // XOR: unit-scoped connection
  } else if (parsed.data.rentalUnitId) {
    throw new Error("Entire-home listings attach the calendar to the property, not a room.");
  }

  const encrypted = encryptSecret(parsed.data.icalUrl);
  const connection = await prisma.calendarConnection.create({
    data: {
      propertyId: connectionPropertyId,
      rentalUnitId,
      platform: parsed.data.platform,
      icalUrlCiphertext: encrypted.ciphertext,
      icalUrlIv: encrypted.iv,
      icalUrlLastFour: lastFour(parsed.data.icalUrl),
    },
  });

  await syncCalendarConnection(connection.id).catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId,
      action: "calendar_connected",
      payload: {
        connectionId: connection.id,
        platform: parsed.data.platform,
        rentalUnitId,
      },
    },
  });

  const stayOnPage = formData.get("stayOnPage") === "true";
  if (stayOnPage) {
    revalidatePath(`/properties/${propertyId}`);
    return;
  }

  // Stay on connect page for partial units until every room has a calendar (or host skips).
  if (property.unitType === "partial_unit") {
    const units = await prisma.rentalUnit.findMany({
      where: { propertyId },
      include: { calendarConnections: { select: { id: true } } },
    });
    const allLinked = units.every((u) => u.calendarConnections.length > 0);
    if (!allLinked) {
      redirect(`/properties/${propertyId}/connect-calendar`);
    }
  }

  redirect(`/properties/${propertyId}/registration`);
}

const rentalUnitSchema = z.object({
  name: z.string().trim().min(1, "Room name is required").max(80),
  roomsOffered: z.coerce.number().int().min(1, "At least 1 bedroom").max(20),
});

export async function addRentalUnit(propertyId: string, formData: FormData) {
  const session = await requireSession();
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== session.user.id) throw new Error("Not authorized");
  if (property.unitType !== "partial_unit") {
    throw new Error("Only partial-unit homes can add room listings.");
  }

  const parsed = rentalUnitSchema.safeParse({
    name: formData.get("name"),
    roomsOffered: formData.get("roomsOffered") || 1,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  await prisma.rentalUnit.create({
    data: {
      propertyId,
      name: parsed.data.name,
      roomsOffered: parsed.data.roomsOffered,
    },
  });
  await refreshPropertyRoomsOffered(propertyId);
  await validatePartialUnitCompliance(propertyId);

  revalidatePath(`/properties/${propertyId}`);
}

export async function updateRentalUnit(unitId: string, formData: FormData) {
  const session = await requireSession();
  const unit = await prisma.rentalUnit.findUniqueOrThrow({
    where: { id: unitId },
    include: { property: { select: { id: true, userId: true, unitType: true } } },
  });
  if (unit.property.userId !== session.user.id) throw new Error("Not authorized");

  const parsed = rentalUnitSchema.safeParse({
    name: formData.get("name"),
    roomsOffered: formData.get("roomsOffered") || unit.roomsOffered,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  await prisma.rentalUnit.update({
    where: { id: unitId },
    data: { name: parsed.data.name, roomsOffered: parsed.data.roomsOffered },
  });
  await refreshPropertyRoomsOffered(unit.property.id);
  await validatePartialUnitCompliance(unit.property.id);

  revalidatePath(`/properties/${unit.property.id}`);
}

export async function deleteRentalUnit(unitId: string) {
  const session = await requireSession();
  const unit = await prisma.rentalUnit.findUniqueOrThrow({
    where: { id: unitId },
    include: {
      property: { select: { id: true, userId: true } },
    },
  });
  if (unit.property.userId !== session.user.id) throw new Error("Not authorized");

  const remaining = await prisma.rentalUnit.count({ where: { propertyId: unit.property.id } });
  if (remaining <= 1) {
    throw new Error("Keep at least one room listing on a partial-unit property.");
  }

  await prisma.rentalUnit.delete({ where: { id: unitId } });
  await refreshPropertyRoomsOffered(unit.property.id);
  await validatePartialUnitCompliance(unit.property.id);

  revalidatePath(`/properties/${unit.property.id}`);
}

const registrationSchema = z.object({
  registrationNumber: z.string().trim().min(1, "Registration number is required"),
  registrationIssueDate: z.string().trim().min(1, "Issue date is required"),
  registrationExpiryDate: z.string().trim().min(1, "Expiry date is required"),
});

export async function setRegistration(propertyId: string, formData: FormData) {
  const session = await requireSession();
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== session.user.id) throw new Error("Not authorized");

  const parsed = registrationSchema.safeParse({
    registrationNumber: formData.get("registrationNumber"),
    registrationIssueDate: formData.get("registrationIssueDate"),
    registrationExpiryDate: formData.get("registrationExpiryDate"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      registrationNumber: parsed.data.registrationNumber,
      registrationIssueDate: new Date(parsed.data.registrationIssueDate),
      registrationExpiryDate: new Date(parsed.data.registrationExpiryDate),
      registrationStatus: "active",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId,
      action: "registration_set",
      payload: { registrationNumber: parsed.data.registrationNumber },
    },
  });

  redirect(`/properties/${propertyId}/done`);
}
