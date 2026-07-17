import "dotenv/config";
import { syncAllCalendarConnections } from "@/lib/ical-sync";

/**
 * Self-hosted alternative to hitting /api/cron/sync-calendars over HTTP —
 * run this directly from system cron (e.g. every 6 hours) if you're not on
 * a platform with its own cron trigger. `pnpm ical:sync`.
 */
async function main() {
  const results = await syncAllCalendarConnections();
  const errors = results.filter((r) => r.status === "error");

  console.log(`Synced ${results.length} calendar connection(s), ${errors.length} error(s).`);
  for (const r of results) {
    console.log(
      `- ${r.connectionId}: ${r.status} | events=${r.eventsSeen} created=${r.bookingsCreated} ` +
        `updated=${r.bookingsUpdated} flaggedMissing=${r.bookingsFlaggedMissing} cancelled=${r.bookingsCancelled}` +
        (r.message ? ` | ${r.message}` : "")
    );
  }

  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("iCal sync run failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });
