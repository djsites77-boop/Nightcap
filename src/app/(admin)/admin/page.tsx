import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { KpiStat } from "@/components/ui/kpi-stat";
import { TierBarChart } from "@/components/charts/tier-bar-chart";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
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

  // Flat monthly tier price (field name is legacy; not × listings).
  const mrrCents = users.reduce((sum, u) => {
    const price = u.subscription?.pricePerPropertyCents ?? 0;
    return sum + price;
  }, 0);

  const tierCounts: Record<string, number> = {};
  for (const u of users) {
    if (u.subscription) {
      tierCounts[u.subscription.tierId] = (tierCounts[u.subscription.tierId] ?? 0) + 1;
    }
  }

  const barData = tiers.map((t) => ({
    name: t.name,
    hosts: tierCounts[t.id] ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Platform pulse"
        description="Hosts, listings, and estimated MRR — billing isn’t live yet."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat label="Hosts" value={userCount} />
        <KpiStat label="Listings" value={propertyCount} />
        <KpiStat label="Est. MRR" value={fmtMoney(mrrCents)} tone="accent" hint="catalog estimate" />
        <KpiStat
          label="Avg / host"
          value={userCount > 0 ? (propertyCount / userCount).toFixed(1) : "0"}
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Hosts by plan</CardTitle>
        </CardHeader>
        <CardContent>
          <TierBarChart data={barData} />
        </CardContent>
      </Card>
    </div>
  );
}
