import Link from "next/link";
import { Newspaper, Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { getCachedRegionalNews } from "@/lib/regional-news";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PortfolioNightsChart,
  type PropertyNightSeries,
} from "@/components/charts/occupancy-area-chart";
import { NightGauge } from "@/components/night-gauge";
import {
  statusSortRank,
  type PortfolioRowData,
} from "@/components/portfolio-property-row";
import { PortfolioList } from "@/components/portfolio-list";
import { ensurePropertyLocation } from "@/lib/property-location";
import { accommodationTaxShortLabel } from "@/lib/accommodation-tax";

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

function lastSixMonthKeys(): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

/** Attribute nights from each booking into calendar months (UTC), per property. */
function nightsByPropertyMonth(
  bookings: Array<{ propertyId: string; checkIn: Date; checkOut: Date }>,
  propertyIds: string[],
  monthKeys: string[]
): PropertyNightSeries[] {
  const index = new Map(monthKeys.map((k, i) => [k, i]));
  const counts = new Map<string, number[]>(
    propertyIds.map((id) => [id, monthKeys.map(() => 0)])
  );

  for (const b of bookings) {
    const months = counts.get(b.propertyId);
    if (!months) continue;
    const cursor = new Date(b.checkIn);
    cursor.setUTCHours(12, 0, 0, 0);
    const end = new Date(b.checkOut);
    while (cursor < end) {
      const i = index.get(monthKey(cursor));
      if (i != null) months[i] = (months[i] ?? 0) + 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return propertyIds.map((id) => ({
    id,
    nickname: id,
    months: counts.get(id) ?? monthKeys.map(() => 0),
  }));
}

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name.split(" ")[0] ?? "there";

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: { municipality: true },
  });

  for (const p of properties) {
    if (p.latitude == null || p.longitude == null) {
      await ensurePropertyLocation(p.id);
    }
  }

  const located = await prisma.property.findMany({
    where: { id: { in: properties.map((p) => p.id) } },
    orderBy: { createdAt: "asc" },
    include: { municipality: true },
  });

  const views = await Promise.all(located.map((p) => getPropertyStatusView(p.id)));
  const rows = located
    .map((p, i) => {
      const view = views[i]!;
      const row: PortfolioRowData = {
        id: p.id,
        nickname: p.nickname,
        address: p.address,
        municipalityLabel: `${p.municipality.name}, ${p.municipality.province}`,
        taxDueLabel: `${accommodationTaxShortLabel(p.municipality.province)} due`,
        status: view.status,
        nightsUsed: view.nightsUsed,
        cap: view.cap,
        daysToRenewal: view.daysToRenewal,
        matDueCents: view.matDueCents,
      };
      return { property: p, view, row };
    })
    .sort((a, b) => {
      const byStatus = statusSortRank(a.view.status) - statusSortRank(b.view.status);
      if (byStatus !== 0) return byStatus;
      const aRatio =
        a.view.cap && a.view.nightsUsed != null ? a.view.nightsUsed / a.view.cap : 0;
      const bRatio =
        b.view.cap && b.view.nightsUsed != null ? b.view.nightsUsed / b.view.cap : 0;
      return bRatio - aRatio;
    });

  const portfolioRows = rows.map((r) => r.row);
  const monthKeys = lastSixMonthKeys();
  const monthLabels = monthKeys.map(monthLabel);

  const bookings = await prisma.booking.findMany({
    where: {
      property: { userId: session.user.id, archivedAt: null },
      cancelledAt: null,
    },
    select: { propertyId: true, checkIn: true, checkOut: true },
  });

  const nightSeries = nightsByPropertyMonth(
    bookings,
    located.map((p) => p.id),
    monthKeys
  ).map((s) => ({
    ...s,
    nickname: located.find((p) => p.id === s.id)?.nickname ?? s.id,
  }));
  // Keep chart property order aligned with urgency-sorted rows when possible
  const orderedSeries: PropertyNightSeries[] = rows.map((r) => {
    const found = nightSeries.find((s) => s.id === r.property.id);
    return (
      found ?? {
        id: r.property.id,
        nickname: r.property.nickname,
        months: monthKeys.map(() => 0),
      }
    );
  });

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
  const provinces = [...new Set(rows.map((r) => r.property.municipality.province))];
  const taxShort =
    provinces.length === 1 ? accommodationTaxShortLabel(provinces[0]!) : "Tax";
  const attention = riskCount + warningCount;
  const single = rows.length === 1 ? rows[0] : null;
  const largePortfolio = rows.length >= 4;

  const greeting =
    rows.length === 0
      ? "Let's add your first place"
      : attention > 0
        ? `${attention} of ${rows.length} need a look`
        : rows.length === 1
          ? "You're clear tonight"
          : `All ${rows.length} places look clear`;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Good to see you, {firstName}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {greeting}
          </h1>
        </div>
        {rows.length > 0 && (
          <Button asChild variant="subtle" className="w-full shrink-0 sm:w-auto">
            <Link href="/properties/new">
              <Plus className="size-4" />
              Add property
            </Link>
          </Button>
        )}
      </section>

      {rows.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="relative flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Sparkles className="size-7" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">Add your first place</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Nitecap watches night caps, tax ledgers, and registration renewals so you
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
          {/* Portfolio summary — one strip, not competing KPI cards */}
          <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-3xl sm:grid-cols-3">
            <div className="space-y-1.5 bg-surface-glass px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-xs font-semibold text-muted-foreground">Needs attention</p>
              <p
                className={`text-2xl font-extrabold tabular-nums leading-none ${
                  riskCount
                    ? "text-status-risk"
                    : warningCount
                      ? "text-status-warning"
                      : "text-status-ok"
                }`}
              >
                {attention}
              </p>
              <p className="text-[11px] font-semibold leading-snug text-subtle-foreground">
                {riskCount} urgent · {warningCount} watch
              </p>
            </div>
            <div className="space-y-1.5 bg-surface-glass px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-xs font-semibold text-muted-foreground">{taxShort} to remit</p>
              <p className="text-2xl font-extrabold tabular-nums leading-none text-foreground">
                {matDueTotalCents > 0 ? fmtMoney(matDueTotalCents) : "$0"}
              </p>
              <p className="text-[11px] font-semibold leading-snug text-subtle-foreground">open periods</p>
            </div>
            <div className="col-span-2 space-y-1.5 bg-surface-glass px-4 py-4 sm:col-span-1 sm:px-5 sm:py-5">
              <p className="text-xs font-semibold text-muted-foreground">Portfolio</p>
              <p className="text-2xl font-extrabold tabular-nums leading-none text-foreground">{rows.length}</p>
              <p className="text-[11px] font-semibold leading-snug text-subtle-foreground">
                {rows.length === 1
                  ? "listing"
                  : largePortfolio
                    ? "listings · attention first"
                    : "listings · sorted by urgency"}
              </p>
            </div>
          </div>

          {/* Single listing: gauge is the right hero. Multi: skip — compare in the list. */}
          {single && single.view.cap != null && single.view.nightsUsed != null && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <Badge variant={single.view.status}>
                  {single.view.status === "ok"
                    ? "On track"
                    : single.view.status === "warning"
                      ? "Getting close"
                      : "Needs you now"}
                </Badge>
                <NightGauge
                  nightsUsed={single.view.nightsUsed}
                  cap={single.view.cap}
                  status={single.view.status}
                  size="lg"
                />
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/properties/${single.property.id}`}>Open listing</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-hidden p-0">
            <CardHeader className="flex flex-row items-end justify-between gap-4 border-b border-border px-4 py-5 sm:px-5">
              <div className="min-w-0 space-y-1.5">
                <CardTitle>
                  {rows.length === 1
                    ? "Your listing"
                    : largePortfolio
                      ? "Work queue"
                      : "Listings by urgency"}
                </CardTitle>
                <p className="text-sm leading-snug text-muted-foreground">
                  {rows.length === 1
                    ? "Tap through for nights, tax, docs, and more."
                    : largePortfolio
                      ? attention > 0
                        ? `Showing what needs you first — ${attention} of ${rows.length}.`
                        : `All clear. Browse or search all ${rows.length} listings.`
                      : "Compare night caps side by side — worst first."}
                </p>
              </div>
              <Link
                href="/properties"
                className="mb-0.5 shrink-0 text-sm font-bold text-accent-strong hover:underline"
              >
                Gallery
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <PortfolioList rows={portfolioRows} attentionCount={attention} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1.5">
              <CardTitle>Nights booked — last 6 months</CardTitle>
              <p className="text-sm leading-snug text-muted-foreground">
                Portfolio total by default — filter listings or switch to Compare.
              </p>
            </CardHeader>
            <CardContent>
              <PortfolioNightsChart monthLabels={monthLabels} series={orderedSeries} />
            </CardContent>
          </Card>

          {newsByRegion.some((r) => r.items.length > 0) && (
            <div
              className={`grid grid-cols-1 gap-4 ${
                newsByRegion.filter((r) => r.items.length > 0).length > 1 ? "xl:grid-cols-2" : ""
              }`}
            >
              {newsByRegion
                .filter((r) => r.items.length > 0)
                .map(({ municipality, items }) => (
                  <Card key={municipality.id}>
                    <CardHeader className="flex flex-row items-start gap-2">
                      <Newspaper className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />
                      <CardTitle className="text-sm leading-snug sm:text-base">
                        STR news — {municipality.name}, {municipality.province}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                      {items.map((item) => (
                        <a
                          key={item.url}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-2xl border border-border p-3 transition-colors hover:border-border-strong hover:bg-surface-alt"
                        >
                          <p className="text-sm font-bold text-foreground">{item.headline}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
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
        </>
      )}
    </div>
  );
}
