import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { PropertyCard } from "@/components/property-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function DashboardPage() {
  const session = await requireSession();
  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const views = await Promise.all(properties.map((p) => getPropertyStatusView(p.id)));
  const rows = properties.map((p, i) => ({ property: p, view: views[i] }));

  const entireHomes = rows.filter((r) => r.property.unitType === "entire_home").length;
  const riskCount = rows.filter((r) => r.view.status === "risk").length;
  const warningCount = rows.filter((r) => r.view.status === "warning").length;
  const matDueTotalCents = rows.reduce((sum, r) => sum + r.view.matDueCents, 0);
  const nextRenewal = rows
    .map((r) => r.view.daysToRenewal)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? "property" : "properties"} · Toronto
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/properties/new">+ Add property</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <p className="font-display text-lg font-semibold text-foreground">No properties yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first Toronto listing to start tracking its night cap, MAT ledger, and registration
              renewal.
            </p>
            <Button asChild className="mt-2">
              <Link href="/properties/new">+ Add property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Properties</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="font-mono text-2xl font-semibold tabular-nums">{properties.length}</div>
                <div className="mt-0.5 text-xs text-subtle-foreground">
                  {entireHomes} entire-home · {properties.length - entireHomes} partial-unit
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Needs attention</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div
                  className={`font-mono text-2xl font-semibold tabular-nums ${
                    riskCount ? "text-status-risk" : warningCount ? "text-status-warning" : ""
                  }`}
                >
                  {riskCount + warningCount}
                </div>
                <div className="mt-0.5 text-xs text-subtle-foreground">
                  {riskCount} risk · {warningCount} warning
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>MAT due</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="font-mono text-2xl font-semibold tabular-nums">
                  {matDueTotalCents > 0 ? fmtMoney(matDueTotalCents) : "$0"}
                </div>
                <div className="mt-0.5 text-xs text-subtle-foreground">across all properties</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Next renewal</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="font-mono text-2xl font-semibold tabular-nums">
                  {nextRenewal !== undefined ? `${nextRenewal}d` : "—"}
                </div>
                <div className="mt-0.5 text-xs text-subtle-foreground">soonest registration expiry</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map(({ property, view }) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                nickname={property.nickname}
                address={property.address}
                view={view}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
