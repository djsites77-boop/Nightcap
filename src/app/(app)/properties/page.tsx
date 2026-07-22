import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { ensurePropertyLocation } from "@/lib/property-location";
import { resolvePropertyThumbUrl } from "@/lib/property-thumb";
import { PropertyCard } from "@/components/property-card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SyncAllCalendarsButton } from "@/components/property-detail/host-actions";
import { accommodationTaxShortLabel } from "@/lib/accommodation-tax";

export default async function PropertiesPage() {
  const session = await requireSession();

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });

  for (const p of properties) {
    if (p.latitude == null || p.longitude == null) {
      await ensurePropertyLocation(p.id);
    }
  }

  const located = await prisma.property.findMany({
    where: { id: { in: properties.map((p) => p.id) } },
    orderBy: { createdAt: "asc" },
    include: {
      municipality: true,
      _count: { select: { complianceViolations: { where: { acknowledgedAt: null } } } },
    },
  });

  const views = await Promise.all(located.map((p) => getPropertyStatusView(p.id)));
  const thumbs = await Promise.all(located.map((p) => resolvePropertyThumbUrl(p)));
  const rows = located.map((p, i) => ({
    property: p,
    view: views[i],
    thumb: thumbs[i],
    violationCount: p._count.complianceViolations,
  }));

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Open a listing to see nights, tax, docs, expenses, and inventory."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > 0 ? <SyncAllCalendarsButton /> : null}
            <Button asChild>
              <Link href="/properties/new">
                <Plus className="size-4" />
                Add property
              </Link>
            </Button>
          </div>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold">No properties yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first listing to track night caps, accommodation tax, and renewals.
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map(({ property, view, thumb, violationCount }) => (
            <PropertyCard
              key={property.id}
              id={property.id}
              nickname={property.nickname}
              address={property.address}
              view={view}
              thumbSrc={thumb?.src ?? null}
              thumbKind={thumb?.kind ?? null}
              violationCount={violationCount}
              taxDueLabel={`${accommodationTaxShortLabel(property.municipality.province)} due`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
