import Link from "next/link";
import { Newspaper, Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { getCachedRegionalNews } from "@/lib/regional-news";
import { PropertyCard } from "@/components/property-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OccupancyAreaChart, type MonthPoint } from "@/components/charts/occupancy-area-chart";
import { NightGauge } from "@/components/night-gauge";
import { ensurePropertyLocation } from "@/lib/property-location";
import { resolvePropertyThumbUrl } from "@/lib/property-thumb";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-CA", { month: "short" });
}

/** Attribute nights from each booking into calendar months (UTC). */
function nightsByMonth(bookings: Array<{ checkIn: Date; checkOut: Date }>): MonthPoint[] {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    map.set(monthKey(d), 0);
  }

  for (const b of bookings) {
    const cursor = new Date(b.checkIn);
    cursor.setUTCHours(12, 0, 0, 0);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const key = monthKey(cursor);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return [...map.entries()].map(([key, nights]) => ({ label: monthLabel(key), nights }));
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name.split(" ")[0] ?? "there";

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { municipality: true },
  });

  // Backfill map pins for older listings (best-effort, sequential for Nominatim)
  for (const p of properties) {
    if (p.latitude == null || p.longitude == null) {
      await ensurePropertyLocation(p.id);
    }
  }
  const located = await prisma.property.findMany({
    where: { id: { in: properties.map((p) => p.id) } },
    orderBy: { createdAt: "asc" },
  });

  const views = await Promise.all(located.map((p) => getPropertyStatusView(p.id)));
  const thumbs = await Promise.all(located.map((p) => resolvePropertyThumbUrl(p)));
  const rows = located.map((p, i) => ({
    property: p,
    view: views[i],
    thumb: thumbs[i],
  }));

  const bookings = await prisma.booking.findMany({
    where: {
      property: { userId: session.user.id, archivedAt: null },
      cancelledAt: null,
    },
    select: { checkIn: true, checkOut: true },
  });
  const chartData = nightsByMonth(bookings);

  const regions = [...new Map(properties.map((p) => [p.municipality.id, p.municipality])).values()];
  const newsByRegion = await Promise.all(
    regions.map(async (m) => ({
      municipality: m,
      items: await getCachedRegionalNews(m.id, `${m.name}, ${m.province}`),
    }))
  );

  const riskCount = rows.filter((r) => r.view.status === "risk").length;
  const warningCount = rows.filter((r) => r.view.status === "warning").length;
  const matDueTotalCents = rows.reduce((sum, r) => sum + r.view.matDueCents, 0);
  const attention = riskCount + warningCount;

  const hero =
    rows.find((r) => r.view.status === "risk" && r.view.cap != null) ??
    rows.find((r) => r.view.status === "warning" && r.view.cap != null) ??
    rows.find((r) => r.view.cap != null) ??
    rows[0];

  const greeting =
    attention > 0
      ? `${attention} listing${attention === 1 ? "" : "s"} need a look`
      : "You're clear for tonight";

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <p className="text-sm font-semibold text-muted-foreground">Good to see you, {firstName}</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {greeting}
        </h1>
      </section>

      {properties.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="relative flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Sparkles className="size-7" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">Add your first place</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Nightcap watches your night cap, tax ledger, and registration renewals so you
                don&apos;t have to spreadsheet it.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/properties/new">
                <Plus className="size-4" />
                Add a property
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center gap-4 pt-8 pb-6 sm:pt-10">
                {hero?.view.cap != null && hero.view.nightsUsed != null ? (
                  <>
                    <div className="text-center">
                      <p className="text-sm font-bold text-muted-foreground">{hero.property.nickname}</p>
                      <Badge variant={hero.view.status} className="mt-2">
                        {hero.view.status === "ok"
                          ? "On track"
                          : hero.view.status === "warning"
                            ? "Getting close"
                            : "Over or critical"}
                      </Badge>
                    </div>
                    <NightGauge
                      nightsUsed={hero.view.nightsUsed}
                      cap={hero.view.cap}
                      status={hero.view.status}
                      size="lg"
                    />
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/properties/${hero.property.id}`}>View this listing</Link>
                    </Button>
                  </>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-5xl font-extrabold tabular-nums">{properties.length}</p>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      properties in your Nightcap
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:gap-4">
              <Card>
                <CardContent className="flex h-full flex-col justify-between gap-2 p-5">
                  <p className="text-sm font-bold text-muted-foreground">Needs attention</p>
                  <p
                    className={`text-4xl font-extrabold tabular-nums ${
                      riskCount
                        ? "text-status-risk"
                        : warningCount
                          ? "text-status-warning"
                          : "text-status-ok"
                    }`}
                  >
                    {attention}
                  </p>
                  <p className="text-xs font-semibold text-subtle-foreground">
                    {riskCount} urgent · {warningCount} watch
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex h-full flex-col justify-between gap-2 p-5">
                  <p className="text-sm font-bold text-muted-foreground">MAT to remit</p>
                  <p className="text-4xl font-extrabold tabular-nums text-foreground">
                    {matDueTotalCents > 0 ? fmtMoney(matDueTotalCents) : "$0"}
                  </p>
                  <p className="text-xs font-semibold text-subtle-foreground">open quarters</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="flex h-full flex-col justify-between gap-2 p-5">
                  <p className="text-sm font-bold text-muted-foreground">Your places</p>
                  <p className="text-4xl font-extrabold tabular-nums">{properties.length}</p>
                  <Button variant="subtle" size="sm" asChild className="mt-1 w-fit">
                    <Link href="/properties/new">
                      <Plus className="size-3.5" />
                      Add another
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nights booked — last 6 months</CardTitle>
            </CardHeader>
            <CardContent>
              <OccupancyAreaChart data={chartData} />
            </CardContent>
          </Card>

          {newsByRegion.some((r) => r.items.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                          className="block rounded-2xl border border-border p-3 transition-colors hover:border-border-strong hover:bg-surface-alt"
                        >
                          <p className="text-sm font-bold text-foreground">{item.headline}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                          <p className="mt-2 text-[11px] font-semibold text-subtle-foreground">
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

          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">Your listings</h2>
              <Link
                href="/properties/new"
                className="text-sm font-bold text-accent-strong hover:underline"
              >
                Add new
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {rows.map(({ property, view, thumb }) => (
                <PropertyCard
                  key={property.id}
                  id={property.id}
                  nickname={property.nickname}
                  address={property.address}
                  view={view}
                  thumbSrc={thumb?.src ?? null}
                  thumbKind={thumb?.kind ?? null}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
