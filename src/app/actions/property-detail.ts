"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { syncCalendarConnection } from "@/lib/ical-sync";
import { getDocumentStorage, buildDocumentStorageKey } from "@/lib/storage";
import { recomputeMatForBookingSpan, recomputeMatLedger } from "@/lib/mat-ledger";
import { recomputeNightTally } from "@/lib/night-tally";

async function assertOwnsProperty(propertyId: string, userId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== userId) throw new Error("Not authorized");
  return property;
}

export async function markMatRemitted(matPeriodId: string) {
  const session = await requireSession();
  const period = await prisma.matPeriod.findUniqueOrThrow({ where: { id: matPeriodId } });
  await assertOwnsProperty(period.propertyId, session.user.id);

  await prisma.matPeriod.update({
    where: { id: matPeriodId },
    data: { status: "remitted", remittedAt: new Date(), remittedById: session.user.id },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: period.propertyId,
      action: "mat_period_remitted",
      payload: { matPeriodId },
    },
  });

  revalidatePath(`/properties/${period.propertyId}`);
}

export async function retryCalendarSync(calendarConnectionId: string) {
  const session = await requireSession();
  const connection = await prisma.calendarConnection.findUniqueOrThrow({
    where: { id: calendarConnectionId },
  });
  await assertOwnsProperty(connection.propertyId, session.user.id);

  await syncCalendarConnection(calendarConnectionId);
  revalidatePath(`/properties/${connection.propertyId}`);
}

/** Manual sync for any connection (connected or error) — spec §5a. */
export async function syncPropertyCalendars(propertyId: string) {
  const session = await requireSession();
  await assertOwnsProperty(propertyId, session.user.id);

  const connections = await prisma.calendarConnection.findMany({ where: { propertyId } });
  for (const c of connections) {
    await syncCalendarConnection(c.id).catch(() => undefined);
  }
  await recomputeMatLedger(propertyId, new Date().getUTCFullYear());
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
}

export async function toggleInspectionItem(itemId: string, completed: boolean) {
  const session = await requireSession();
  const item = await prisma.inspectionItem.findUniqueOrThrow({ where: { id: itemId } });
  await assertOwnsProperty(item.propertyId, session.user.id);

  await prisma.inspectionItem.update({
    where: { id: itemId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? session.user.id : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: item.propertyId,
      action: completed ? "inspection_completed" : "inspection_uncleared",
      payload: { itemId, itemKey: item.itemKey },
    },
  });

  revalidatePath(`/properties/${item.propertyId}`);
}

export async function getDocumentViewUrl(documentId: string): Promise<string> {
  const session = await requireSession();
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await assertOwnsProperty(doc.propertyId, session.user.id);

  const storage = getDocumentStorage();
  return storage.getSignedUrl(doc.storageKey);
}

const uploadSchema = z.object({
  propertyId: z.string().min(1),
  docType: z.enum(["fire_safety_cert", "insurance", "floor_plan", "other"]),
  expiryDate: z.string().optional(),
});

export async function uploadDocument(formData: FormData) {
  const session = await requireSession();
  const parsed = uploadSchema.safeParse({
    propertyId: formData.get("propertyId"),
    docType: formData.get("docType"),
    expiryDate: formData.get("expiryDate") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  await assertOwnsProperty(parsed.data.propertyId, session.user.id);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > 8 * 1024 * 1024) throw new Error("File must be under 8MB.");

  const doc = await prisma.document.create({
    data: {
      propertyId: parsed.data.propertyId,
      docType: parsed.data.docType,
      fileName: file.name.slice(0, 180),
      storageKey: "",
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      expiryDate: parsed.data.expiryDate
        ? new Date(`${parsed.data.expiryDate}T00:00:00Z`)
        : null,
    },
  });

  const key = buildDocumentStorageKey(parsed.data.propertyId, doc.id, doc.fileName);
  const buf = Buffer.from(await file.arrayBuffer());
  await getDocumentStorage().put(key, buf, doc.mimeType);
  await prisma.document.update({
    where: { id: doc.id },
    data: { storageKey: key },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: parsed.data.propertyId,
      action: "document_uploaded",
      payload: { documentId: doc.id, docType: doc.docType, fileName: doc.fileName },
    },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
  revalidatePath("/documents");
}

const manualBookingSchema = z.object({
  propertyId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  platform: z.enum(["airbnb", "vrbo", "direct"]),
  grossAmount: z.coerce.number().optional(),
});

/** Manual booking / revenue entry for MVP MAT ledger (spec §10). */
export async function addManualBooking(formData: FormData) {
  const session = await requireSession();
  const parsed = manualBookingSchema.safeParse({
    propertyId: formData.get("propertyId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    platform: formData.get("platform"),
    grossAmount: formData.get("grossAmount") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  await assertOwnsProperty(parsed.data.propertyId, session.user.id);

  const checkIn = new Date(`${parsed.data.checkIn}T00:00:00Z`);
  const checkOut = new Date(`${parsed.data.checkOut}T00:00:00Z`);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
  if (nights <= 0) throw new Error("Check-out must be after check-in.");

  const booking = await prisma.booking.create({
    data: {
      propertyId: parsed.data.propertyId,
      checkIn,
      checkOut,
      nights,
      platform: parsed.data.platform,
      source: "manual",
      grossAmount: parsed.data.grossAmount ?? null,
    },
  });

  await recomputeNightTally(parsed.data.propertyId);
  await recomputeMatForBookingSpan(parsed.data.propertyId, checkIn, checkOut);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: parsed.data.propertyId,
      action: "booking_manual_created",
      payload: {
        bookingId: booking.id,
        nights,
        grossAmount: parsed.data.grossAmount ?? null,
      },
    },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
}

export async function updateBookingRevenue(formData: FormData) {
  const session = await requireSession();
  const bookingId = String(formData.get("bookingId") ?? "");
  const raw = formData.get("grossAmount");
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  await assertOwnsProperty(booking.propertyId, session.user.id);

  const amount =
    raw === "" || raw == null ? null : Number(raw);
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
    throw new Error("Invalid amount.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { grossAmount: amount },
  });

  await recomputeMatForBookingSpan(booking.propertyId, booking.checkIn, booking.checkOut);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId: booking.propertyId,
      action: "booking_revenue_updated",
      payload: { bookingId, grossAmount: amount },
    },
  });

  revalidatePath(`/properties/${booking.propertyId}`);
}
