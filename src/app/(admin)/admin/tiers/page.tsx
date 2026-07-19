import { prisma } from "@/lib/db";
import { TierManager } from "./tier-manager";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminTiersPage() {
  const tiers = await prisma.pricingTier.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: [{ displayOrder: "asc" }, { pricePerPropertyCents: "asc" }],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Tiers & pricing"
        description="Live catalog — hosts are limited (and eventually billed) per property by their tier. Edits don’t reprice existing subscribers until you re-assign them under Users."
      />

      <TierManager
        tiers={tiers.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description,
          propertyLimit: t.propertyLimit,
          pricePerPropertyCents: t.pricePerPropertyCents,
          active: t.active,
          isDefault: t.isDefault,
          displayOrder: t.displayOrder,
          subscriberCount: t._count.subscriptions,
        }))}
      />
    </div>
  );
}
