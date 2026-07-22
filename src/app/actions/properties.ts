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

  // For now, store the roomsOffered on the property and create a single RentalUnit
  // (Future: UI will support multiple RentalUnits per partial-unit property)
  if (data.unitType === "partial_unit" && roomsOffered) {
    const rentalUnit = await prisma.rentalUnit.create({
      data: {
        propertyId: property.id,
        name: `${property.nickname} - Room 1`,
        roomsOffered,
      },
    });

    // Validate and log any compliance violations
    const validation = await validatePartialUnitCompliance(property.id);
    if (!validation.isCompliant) {
      // Log but don't block — host still proceeds to onboarding
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          propertyId: property.id,
          action: "compliance_violation_detected",
          payload: {
            violations: validation.violations,
            rentalUnitId: rentalUnit.id,
          },
        },
      });
    }
  }

  redirect(`/properties/${property.id}/connect-calendar`);
}

const connectCalendarSchema = z.object({
  platform: z.enum(["airbnb", "vrbo", "direct"]),
  icalUrl: z.string().trim().url("Enter a valid iCal URL"),
});

export async function connectCalendar(propertyId: string, formData: FormData) {
  const session = await requireSession();
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== session.user.id) throw new Error("Not authorized");

  const parsed = connectCalendarSchema.safeParse({
    platform: formData.get("platform"),
    icalUrl: formData.get("icalUrl"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const encrypted = encryptSecret(parsed.data.icalUrl);
  const connection = await prisma.calendarConnection.create({
    data: {
      propertyId,
      platform: parsed.data.platform,
      icalUrlCiphertext: encrypted.ciphertext,
      icalUrlIv: encrypted.iv,
      icalUrlLastFour: lastFour(parsed.data.icalUrl),
    },
  });

  // Best-effort initial sync so the host sees real data immediately; failures
  // here just leave the connection in an error state, which the property
  // detail screen surfaces — they don't block onboarding.
  await syncCalendarConnection(connection.id).catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId,
      action: "calendar_connected",
      payload: { connectionId: connection.id, platform: parsed.data.platform },
    },
  });

  redirect(`/properties/${propertyId}/registration`);
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
