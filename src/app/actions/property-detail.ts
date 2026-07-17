"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { syncCalendarConnection } from "@/lib/ical-sync";
import { getDocumentStorage } from "@/lib/storage";

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

  revalidatePath(`/properties/${item.propertyId}`);
}

export async function getDocumentViewUrl(documentId: string): Promise<string> {
  const session = await requireSession();
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  await assertOwnsProperty(doc.propertyId, session.user.id);

  const storage = getDocumentStorage();
  return storage.getSignedUrl(doc.storageKey);
}
