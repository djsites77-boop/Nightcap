import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureSubscription, daysSince } from "@/lib/subscription";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { cn } from "@/lib/utils";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  const [subscription, propertyCount] = await Promise.all([
    ensureSubscription(session.user.id),
    prisma.property.count({ where: { userId: session.user.id, archivedAt: null } }),
  ]);

  // Flat monthly tier price (not × listings) — see pricing research / seed tiers.
  const monthlyCents = subscription.pricePerPropertyCents;
  const limit = subscription.propertyLimit;
  const overLimit = limit != null && propertyCount > limit;
  const nameParts = user.name.trim().split(/\s+/);
  const firstName = user.firstName ?? nameParts[0] ?? "";
  const lastName = user.lastName ?? nameParts.slice(1).join(" ") ?? "";
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "NC";

  return (
    <div>
      <PageHeader title="Account" description="Your profile and plan." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ProfileForm
              firstName={firstName}
              lastName={lastName}
              email={user.email}
              phone={user.phone ?? ""}
              initials={initials}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-subtle-foreground">Tier</p>
                <p className="mt-0.5 text-lg font-extrabold text-foreground">{subscription.tier.name}</p>
              </div>
              <Badge variant="neutral" dot={false} className="bg-accent-soft text-accent-strong">
                {monthlyCents === 0 ? "Free" : `${fmtMoney(monthlyCents)}/mo`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-alt px-4 py-3">
                <p className="text-xs font-bold text-muted-foreground">Listings used</p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-extrabold tabular-nums",
                    overLimit ? "text-status-risk" : "text-foreground"
                  )}
                >
                  {propertyCount}
                  <span className="text-base font-bold text-muted-foreground">
                    {limit != null ? ` / ${limit}` : " · ∞"}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl bg-surface-alt px-4 py-3">
                <p className="text-xs font-bold text-muted-foreground">Included</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                  {limit != null ? limit : "∞"}
                </p>
              </div>
            </div>

            {overLimit && (
              <p className="rounded-2xl bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning">
                You&apos;re over this plan&apos;s listing limit. Upgrade to stay in sync — billing still
                charges the flat monthly rate for now.
              </p>
            )}

            <div className="rounded-2xl bg-accent-soft px-4 py-4">
              <p className="text-xs font-bold text-accent-strong">Monthly bill</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">
                {fmtMoney(monthlyCents)}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Flat subscription · includes up to {limit != null ? limit : "unlimited"} listing
                {limit === 1 ? "" : "s"}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              On this plan {daysSince(subscription.startedAt)} days
              {subscription.tier.description ? ` · ${subscription.tier.description}` : ""}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
