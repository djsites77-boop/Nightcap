import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { getCachedRegionalNews } from "@/lib/regional-news";
import { PropertyCard } from "@/components/property-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KpiStat } from "@/components/ui/kpi-stat";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function DashboardPage() {
  const session = await requireSession();
  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { municipality: true },
  });

  const views = await Promise.all(properties.map((p) => getPropertyStatusView(p.id)));
  const rows = properties.map((p, i) => ({ property: p, view: views[i] }));

  const regions = [...new Map(properties.map((p) => [p.municipality.id, p.municipality])).values()];
  const newsByRegion = await Promise.all(
    regions.map(async (m) => ({
      municipality: m,
      items: await getCachedRegionalNews(m.id, `${m.name}, ${m.province}`),
    }))
  );

  const entireHomes = rows.filter((r) => r.property.unitType === "entire_home").length;
  const riskCount = rows.filter((r) => r.view.status === "risk").length;
  const warningCount = rows.filter((r) => r.view.status === "warning").length;
  const matDueTotalCents = rows.reduce((sum, r) => sum + r.view.matDueCents, 0);
  const nextRenewal = rows
    .map((r) => r.view.daysToRenewal)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0];

  const attentionTone =
    riskCount > 0 ? "risk" : warningCount > 0 ? "warning" : ("ok" as const);

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Dashboard"
        description={
          <>
            {properties.length} {properties.length === 1 ? "property" : "properties"} tracked for
            compliance — night caps, MAT, and registration renewals at a glance.
          </>
        }
        actions={
          <Button size="sm" asChild>
            <Link href="/properties/new">
              <Plus className="size-3.5" />
              Add property
            </Link>
          </Button>
        }
      />

      {properties.length === 0 ? (
        <Card className="animate-page-in">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-xl font-semibold text-foreground">No properties yet</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Add your first listing to start tracking its night cap, MAT ledger, and registration
              renewal.
            </p>
            <Button asChild className="mt-2">
              <Link href="/properties/new">
                <Plus className="size-3.5" />
                Add property
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiStat
              label="Properties"
              value={properties.length}
              hint={`${entireHomes} entire-home · ${properties.length - entireHomes} partial-unit`}
              stagger={1}
            />
            <KpiStat
              label="Needs attention"
              value={riskCount + warningCount}
              hint={`${riskCount} risk · ${warningCount} warning`}
              tone={attentionTone}
              stagger={2}
            />
            <KpiStat
              label="MAT due"
              value={matDueTotalCents > 0 ? fmtMoney(matDueTotalCents) : "$0"}
              hint="across all properties"
              tone={matDueTotalCents > 0 ? "warning" : "default"}
              stagger={3}
            />
            <KpiStat
              label="Next renewal"
              value={nextRenewal !== undefined ? `${nextRenewal}d` : "—"}
              hint="soonest registration expiry"
              tone={nextRenewal !== undefined && nextRenewal <= 14 ? "risk" : "default"}
              stagger={4}
            />
          </div>

          {newsByRegion.some((r) => r.items.length > 0) && (
            <div className="mb-7 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              {newsByRegion
                .filter((r) => r.items.length > 0)
                .map(({ municipality, items }) => (
                  <Card key={municipality.id}>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <Newspaper className="size-4 text-subtle-foreground" />
                      <CardTitle>
                        STR news — {municipality.name}, {municipality.province}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-3">
                      {items.map((item) => (
                        <a
                          key={item.url}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border border-border p-3 transition-colors hover:border-border-strong hover:bg-surface-alt"
                        >
                          <p className="text-sm font-semibold text-foreground">{item.headline}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                          <p className="mt-2 text-[11px] text-subtle-foreground">
                            {item.source}
                            {item.publishedOn ? ` · ${item.publishedOn}` : ""}
                          </p>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Properties</h2>
            <p className="text-xs text-subtle-foreground">Sorted by date added</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
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
