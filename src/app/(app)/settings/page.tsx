import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureSubscription, daysSince } from "@/lib/subscription";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  });
}

export default async function SettingsPage() {
  const session = await requireSession();
  const [subscription, propertyCount] = await Promise.all([
    ensureSubscription(session.user.id),
    prisma.property.count({ where: { userId: session.user.id, archivedAt: null } }),
  ]);
  const estimateCents = subscription.pricePerPropertyCents * propertyCount;

  return (
    <div>
      <PageHeader title="Account" description="You and your plan." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
                {session.user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-extrabold text-foreground">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tier</span>
              <Badge variant="neutral" dot={false}>
                {subscription.tier.name}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Listings</span>
              <span className="font-extrabold tabular-nums">
                {propertyCount}
                {subscription.propertyLimit != null ? ` / ${subscription.propertyLimit}` : " · unlimited"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="font-extrabold tabular-nums">
                {fmtMoney(subscription.pricePerPropertyCents)}/listing/mo
              </span>
            </div>
            <div className="rounded-2xl bg-accent-soft px-4 py-3">
              <p className="text-xs font-bold text-accent-strong">Estimated monthly</p>
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {fmtMoney(estimateCents)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              On this plan {daysSince(subscription.startedAt)} days · upgrades come through support for
              now.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
