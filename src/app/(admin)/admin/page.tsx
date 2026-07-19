import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KpiStat } from "@/components/ui/kpi-stat";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function AdminOverviewPage() {
  const [userCount, propertyCount, users, tiers] = await Promise.all([
    prisma.user.count({ where: { role: "host" } }),
    prisma.property.count({ where: { archivedAt: null } }),
    prisma.user.findMany({
      where: { role: "host" },
      include: {
        subscription: { include: { tier: true } },
        properties: { where: { archivedAt: null }, select: { id: true } },
      },
    }),
    prisma.pricingTier.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  const mrrCents = users.reduce((sum, u) => {
    const price = u.subscription?.pricePerPropertyCents ?? 0;
    return sum + price * u.properties.length;
  }, 0);

  const tierCounts: Record<string, number> = {};
  let noSubscription = 0;
  for (const u of users) {
    if (u.subscription) {
      tierCounts[u.subscription.tierId] = (tierCounts[u.subscription.tierId] ?? 0) + 1;
    } else {
      noSubscription += 1;
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        description="Hosts, properties, and estimated MRR across the platform. Billing isn’t wired up yet — figures are catalog estimates."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat label="Hosts" value={userCount} stagger={1} />
        <KpiStat label="Properties" value={propertyCount} stagger={2} />
        <KpiStat
          label="Est. MRR"
          value={fmtMoney(mrrCents)}
          hint="no billing wired — estimate"
          tone="accent"
          stagger={3}
        />
        <KpiStat
          label="Avg. properties/host"
          value={userCount > 0 ? (propertyCount / userCount).toFixed(1) : "0"}
          stagger={4}
        />
      </div>

      <Card className="mt-5 animate-page-in stagger-2">
        <CardHeader>
          <CardTitle>Tier breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-5 pt-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="min-w-[5.5rem]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                {tier.name}
                {!tier.active && " · off"}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{tierCounts[tier.id] ?? 0}</div>
            </div>
          ))}
          {noSubscription > 0 && (
            <div className="min-w-[5.5rem]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                No subscription
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{noSubscription}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
