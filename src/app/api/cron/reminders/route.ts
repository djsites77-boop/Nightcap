import { NextResponse } from "next/server";
import { runReminderJob } from "@/lib/reminders";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sent = await runReminderJob();
  return NextResponse.json({ ok: true, sent });
}
