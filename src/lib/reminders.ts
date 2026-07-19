/**
 * Email reminders for MVP §10: renewal <30d, cap >85%, MAT period closing.
 * Without SMTP configured, messages are logged (honest non-delivery — see README).
 * Dedupes via recent AuditLog rows so a cron can run daily safely.
 */

import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getPropertyStatusView } from "@/lib/property-status";
import { quarterBounds } from "@/lib/mat-ledger";

async function deliver(to: string, subject: string, text: string) {
  // Placeholder for a real provider (Resend/SES/SMTP). Logging keeps the job
  // honest when no provider is configured — same stance as auth.ts on verification.
  console.log(`[reminder] to=${to} subject="${subject}"\n${text}\n`);
}

function currentQuarter(d = new Date()) {
  const year = d.getUTCFullYear();
  const quarter = (Math.floor(d.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return { year, quarter, ...quarterBounds(year, quarter) };
}

async function alreadyReminded(
  propertyId: string,
  action: string,
  periodKey: string,
  withinDays: number
): Promise<boolean> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.findMany({
    where: { propertyId, action, createdAt: { gte: since } },
    select: { payload: true },
  });
  return rows.some((r) => {
    const payload = r.payload as { periodKey?: string } | null;
    return payload?.periodKey === periodKey;
  });
}

export async function runReminderJob() {
  const properties = await prisma.property.findMany({
    where: { archivedAt: null },
    include: { user: true, matPeriods: true },
  });

  const sent: string[] = [];

  for (const property of properties) {
    const view = await getPropertyStatusView(property.id);
    const year = new Date().getUTCFullYear();

    if (
      view.cap != null &&
      view.nightsUsed != null &&
      view.nightsUsed >= Math.floor(view.cap * 0.85)
    ) {
      const periodKey = `${year}-cap`;
      if (!(await alreadyReminded(property.id, "reminder_cap_warning", periodKey, 40))) {
        await deliver(
          property.user.email,
          `Nightcap: ${property.nickname} approaching night cap`,
          `${property.nickname} is at ${view.nightsUsed} of ${view.cap} nights for ${year}.`
        );
        await prisma.auditLog.create({
          data: {
            userId: property.userId,
            propertyId: property.id,
            action: "reminder_cap_warning",
            payload: { periodKey, nightsUsed: view.nightsUsed, cap: view.cap },
          },
        });
        sent.push(`cap:${property.id}`);
      }
    }

    if (view.daysToRenewal != null && view.daysToRenewal < 30) {
      const periodKey =
        property.registrationExpiryDate?.toISOString().slice(0, 10) ?? "unknown";
      if (!(await alreadyReminded(property.id, "reminder_renewal_warning", periodKey, 25))) {
        await deliver(
          property.user.email,
          `Nightcap: registration renews soon — ${property.nickname}`,
          `Registration for ${property.nickname} expires in ${view.daysToRenewal} days (${periodKey}).`
        );
        await prisma.auditLog.create({
          data: {
            userId: property.userId,
            propertyId: property.id,
            action: "reminder_renewal_warning",
            payload: { periodKey, daysToRenewal: view.daysToRenewal },
          },
        });
        sent.push(`renewal:${property.id}`);
      }
    }

    const { periodEnd, year: qYear, quarter } = currentQuarter();
    const daysLeft = differenceInCalendarDays(periodEnd, new Date());
    if (daysLeft >= 0 && daysLeft <= 14) {
      const periodKey = `${qYear}-Q${quarter}`;
      const due = property.matPeriods.find(
        (p) =>
          p.status === "due" &&
          p.periodStart.getUTCFullYear() === qYear &&
          p.periodStart.getUTCMonth() === (quarter - 1) * 3
      );
      if (
        due &&
        !(await alreadyReminded(property.id, "reminder_mat_period_closing", periodKey, 20))
      ) {
        await deliver(
          property.user.email,
          `Nightcap: MAT period closing — ${property.nickname}`,
          `Q${quarter} ${qYear} ends in ${daysLeft} days. Tracked amount owed: $${Number(due.amountOwed).toFixed(2)}. Nightcap tracks obligation only — it does not file or pay MAT.`
        );
        await prisma.auditLog.create({
          data: {
            userId: property.userId,
            propertyId: property.id,
            action: "reminder_mat_period_closing",
            payload: { periodKey, amountOwed: Number(due.amountOwed) },
          },
        });
        sent.push(`mat:${property.id}`);
      }
    }
  }

  return sent;
}
