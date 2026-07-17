import { NextRequest, NextResponse } from "next/server";
import { syncAllCalendarConnections } from "@/lib/ical-sync";

/**
 * Cron entry point for the iCal polling sync (spec §5a: every 6–12 hours,
 * plus manual "Sync now"). A simple cron-triggered route is what the spec
 * calls for at MVP scale — "do not over-engineer with a queue system before
 * there's a reason to." Point your platform's scheduler (Vercel Cron, a
 * hosted cron hitting this URL, etc.) at this route with the shared secret.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllCalendarConnections();
  return NextResponse.json({ synced: results.length, results });
}
