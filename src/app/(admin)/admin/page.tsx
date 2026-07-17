import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TIER_CONFIG } from "@/lib/subscription";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function AdminOverviewPage() {
  const [userCount, propertyCount, users] = await Promise.all([
    prisma.user.count({ where: { role: "host" } }),
    prisma.property.count({ where: { archivedAt: null } }),
    prisma.user.findMany({
      where: { role: "host" },
      include: { subscription: true, properties: { where: { archivedAt: null }, select: { id: true } } },
    }),
  ]);

  const mrrCents = users.reduce((sum, u) => {
    const price = u.subscription?.pricePerPropertyCents ?? TIER_CONFIG.free.pricePerPropertyCents;
    return sum + price * u.properties.length;
  }, 0);

  const tierCounts: Record<string, number> = {};
  for (const u of users) {
    const tier = u.subscription?.tier ?? "free";
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Platform overview</h1>
      <p className="mb-6 text-sm text-muted-foreground">Metrics across all hosts and properties.</p>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Hosts</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="font-mono text-2xl font-semibold tabular-nums">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="font-mono text-2xl font-semibold tabular-nums">{propertyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Est. MRR</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="font-mono text-2xl font-semibold tabular-nums">{fmtMoney(mrrCents)}</div>
            <div className="mt-0.5 text-xs text-subtle-foreground">no billing wired up — an estimate</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg. properties/host</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {userCount > 0 ? (propertyCount / userCount).toFixed(1) : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Tier breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 pt-3">
          {(Object.keys(TIER_CONFIG) as Array<keyof typeof TIER_CONFIG>).map((tier) => (
            <div key={tier}>
              <div className="text-xs text-subtle-foreground">{TIER_CONFIG[tier].label}</div>
              <div className="font-mono text-xl font-semibold tabular-nums">{tierCounts[tier] ?? 0}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
