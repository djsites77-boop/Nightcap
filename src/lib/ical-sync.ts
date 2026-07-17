import type * as IcalModule from "node-ical";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { recomputeNightTally } from "@/lib/night-tally";

export interface SyncResult {
  connectionId: string;
  status: "connected" | "error";
  eventsSeen: number;
  bookingsCreated: number;
  bookingsUpdated: number;
  bookingsFlaggedMissing: number;
  bookingsCancelled: number;
  message?: string;
}

/**
 * Syncs one CalendarConnection's iCal feed (spec §5a). The core guard here is
 * fix #4: a feed that comes back with zero events — whether from a network
 * error, a platform hiccup, or a genuinely empty calendar with existing
 * bookings — must never be read as "every booking was cancelled." Absence is
 * only trusted as a real cancellation after it holds across two consecutive
 * *successful* syncs (Booking.pendingCancellationSince).
 */
export async function syncCalendarConnection(connectionId: string): Promise<SyncResult> {
  const connection = await prisma.calendarConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { property: { select: { id: true, userId: true } } },
  });

  const activeBookings = await prisma.booking.findMany({
    where: { calendarConnectionId: connectionId, cancelledAt: null },
    select: { id: true, externalUid: true, pendingCancellationSince: true },
  });

  let events: IcalModule.VEvent[];
  try {
    // Dynamically imported so its heavyweight Temporal-polyfill dependency is
    // never evaluated during Next.js's build-time page-data collection (which
    // runs route modules in a constrained trace VM that doesn't fully support
    // it) — only at actual request time, in the real Node.js runtime.
    const ical: typeof IcalModule = await import("node-ical");
    const icalUrl = decryptSecret({
      ciphertext: connection.icalUrlCiphertext,
      iv: connection.icalUrlIv,
    });
    const parsed = await ical.async.fromURL(icalUrl);
    events = Object.values(parsed).filter(
      (component): component is IcalModule.VEvent => component?.type === "VEVENT"
    );
  } catch (error) {
    return markSyncFailure(connection.id, connection.consecutiveEmptyFetches, {
      message: error instanceof Error ? error.message : "Failed to fetch or parse the iCal feed",
    });
  }

  if (events.length === 0) {
    // A truncated/failed fetch and a legitimately empty new calendar look
    // identical at this layer, so treat both the same way: never process
    // removals. Only report it as an error if we had bookings to lose.
    const message =
      activeBookings.length > 0
        ? "Feed returned zero events while bookings exist — treated as a sync failure, not a mass cancellation."
        : undefined;
    return markSyncFailure(connection.id, connection.consecutiveEmptyFetches, {
      message,
      isRealError: activeBookings.length > 0,
    });
  }

  const feedUids = new Set(events.map((e) => e.uid));
  let bookingsCreated = 0;
  let bookingsUpdated = 0;

  for (const event of events) {
    if (!event.start || !event.end) continue;
    const nights = Math.round((+event.end - +event.start) / (24 * 60 * 60 * 1000));
    if (nights <= 0) continue;

    const existing = await prisma.booking.findUnique({
      where: { calendarConnectionId_externalUid: { calendarConnectionId: connection.id, externalUid: event.uid } },
    });

    if (!existing) {
      await prisma.booking.create({
        data: {
          propertyId: connection.property.id,
          calendarConnectionId: connection.id,
          checkIn: event.start,
          checkOut: event.end,
          nights,
          platform: connection.platform,
          source: "ical_import",
          externalUid: event.uid,
        },
      });
      bookingsCreated++;
    } else {
      const changed =
        existing.checkIn.getTime() !== event.start.getTime() ||
        existing.checkOut.getTime() !== event.end.getTime() ||
        existing.cancelledAt !== null ||
        existing.pendingCancellationSince !== null;
      if (changed) {
        await prisma.booking.update({
          where: { id: existing.id },
          data: {
            checkIn: event.start,
            checkOut: event.end,
            nights,
            cancelledAt: null,
            pendingCancellationSince: null, // reappeared — clear any pending-removal flag
          },
        });
        bookingsUpdated++;
      }
    }
  }

  let bookingsFlaggedMissing = 0;
  let bookingsCancelled = 0;

  for (const booking of activeBookings) {
    if (!booking.externalUid || feedUids.has(booking.externalUid)) continue;

    if (booking.pendingCancellationSince === null) {
      // First time it's been seen missing — flag it, don't cancel yet.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { pendingCancellationSince: new Date() },
      });
      bookingsFlaggedMissing++;
    } else {
      // Missing on a second consecutive successful sync — now trust it.
      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: { cancelledAt: new Date() },
        }),
        prisma.auditLog.create({
          data: {
            userId: connection.property.userId,
            propertyId: connection.property.id,
            action: "booking_cancelled_via_sync",
            payload: { bookingId: booking.id, calendarConnectionId: connection.id },
          },
        }),
      ]);
      bookingsCancelled++;
    }
  }

  await prisma.calendarConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncedAt: new Date(),
      syncStatus: "connected",
      lastError: null,
      consecutiveEmptyFetches: 0,
    },
  });

  await recomputeNightTally(connection.property.id);

  return {
    connectionId: connection.id,
    status: "connected",
    eventsSeen: events.length,
    bookingsCreated,
    bookingsUpdated,
    bookingsFlaggedMissing,
    bookingsCancelled,
  };
}

async function markSyncFailure(
  connectionId: string,
  currentStreak: number,
  opts: { message?: string; isRealError?: boolean }
): Promise<SyncResult> {
  const nextStreak = currentStreak + 1;
  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncedAt: new Date(),
      syncStatus: opts.message ? "error" : "connected",
      lastError: opts.message ?? null,
      consecutiveEmptyFetches: nextStreak,
    },
  });
  return {
    connectionId,
    status: opts.message ? "error" : "connected",
    eventsSeen: 0,
    bookingsCreated: 0,
    bookingsUpdated: 0,
    bookingsFlaggedMissing: 0,
    bookingsCancelled: 0,
    message: opts.message,
  };
}

/** Syncs every non-disconnected CalendarConnection. Intended for a cron trigger. */
export async function syncAllCalendarConnections(): Promise<SyncResult[]> {
  const connections = await prisma.calendarConnection.findMany({
    where: { syncStatus: { not: "disconnected" } },
    select: { id: true },
  });

  const results: SyncResult[] = [];
  for (const { id } of connections) {
    results.push(await syncCalendarConnection(id));
  }
  return results;
}
