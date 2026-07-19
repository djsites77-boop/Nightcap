"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  parseTransactionCsv,
  matchTransactionsToBookings,
  AIRBNB_DEFAULT_MAPPING,
  VRBO_DEFAULT_MAPPING,
} from "@/lib/csv-import";
import { recomputeMatLedger } from "@/lib/mat-ledger";

export interface CsvImportResult {
  totalRows: number;
  matched: number;
  unmatched: number;
}

export async function importTransactionCsv(propertyId: string, formData: FormData): Promise<CsvImportResult> {
  const session = await requireSession();
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.userId !== session.user.id) throw new Error("Not authorized");

  const platform = String(formData.get("platform") ?? "airbnb");
  const file = formData.get("csv");
  if (!(file instanceof File)) throw new Error("Attach a CSV file");

  const csvText = await file.text();
  const mapping = platform === "vrbo" ? VRBO_DEFAULT_MAPPING : AIRBNB_DEFAULT_MAPPING;
  const rows = parseTransactionCsv(csvText, mapping);

  // Airbnb/VRBO exports are account-wide, covering every listing under one
  // login (spec §5b) — filter to rows that plausibly belong to this property
  // by nickname/address substring match before date-matching against its bookings.
  const nick = property.nickname.toLowerCase();
  const addr = property.address.toLowerCase();
  const relevantRows = rows.filter((r) => {
    const listing = r.listing.toLowerCase();
    return (
      listing.includes(nick) ||
      nick.includes(listing) ||
      (listing.length > 3 && addr.includes(listing)) ||
      (listing.length > 3 && listing.includes(addr.slice(0, Math.min(addr.length, 24))))
    );
  });

  const bookings = await prisma.booking.findMany({
    where: { propertyId, cancelledAt: null, grossAmount: null },
    select: { id: true, checkIn: true, checkOut: true },
  });
  const matches = matchTransactionsToBookings(
    relevantRows,
    bookings.map((b) => ({ ...b, grossAmount: null }))
  );

  let matched = 0;
  for (const m of matches) {
    if (!m.matchedBookingId) continue;
    await prisma.booking.update({
      where: { id: m.matchedBookingId },
      data: { grossAmount: m.row.amountCents / 100 },
    });
    matched++;
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      propertyId,
      action: "csv_import",
      payload: { platform, totalRows: rows.length, relevantRows: relevantRows.length, matched },
    },
  });

  const year = new Date().getUTCFullYear();
  await recomputeMatLedger(propertyId, year);
  await recomputeMatLedger(propertyId, year - 1);

  revalidatePath(`/properties/${propertyId}`);

  return { totalRows: relevantRows.length, matched, unmatched: relevantRows.length - matched };
}
