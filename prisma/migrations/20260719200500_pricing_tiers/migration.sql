-- Pricing tiers become database rows (admin-managed catalog) instead of the
-- SubscriptionTier enum. Existing subscriptions are remapped in place:
-- the four legacy enum values are inserted as catalog rows with stable ids
-- ("tier_free" etc.) and subscription.tier -> subscription.tierId.

-- CreateTable
CREATE TABLE "pricing_tier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "propertyLimit" INTEGER,
    "pricePerPropertyCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_tier_code_key" ON "pricing_tier"("code");

-- Data migration: recreate the legacy enum tiers as catalog rows so existing
-- subscriptions can point at them.
INSERT INTO "pricing_tier" ("id", "code", "name", "description", "propertyLimit", "pricePerPropertyCents", "active", "isDefault", "displayOrder", "updatedAt") VALUES
  ('tier_free',      'free',      'Free',      'First property free — try Nightcap end to end.',        1,    0,   true, true,  0, CURRENT_TIMESTAMP),
  ('tier_starter',   'starter',   'Starter',   'For hosts with a handful of listings.',                  5,    500, true, false, 1, CURRENT_TIMESTAMP),
  ('tier_growth',    'growth',    'Growth',    'Growing portfolios at a better per-property rate.',      15,   400, true, false, 2, CURRENT_TIMESTAMP),
  ('tier_portfolio', 'portfolio', 'Portfolio', 'Unlimited properties at the best per-property rate.',    NULL, 350, true, false, 3, CURRENT_TIMESTAMP);

-- AlterTable: remap subscription.tier (enum) -> subscription.tierId (FK)
ALTER TABLE "subscription" ADD COLUMN "tierId" TEXT;
UPDATE "subscription" SET "tierId" = 'tier_' || "tier"::text;
ALTER TABLE "subscription" ALTER COLUMN "tierId" SET NOT NULL;
ALTER TABLE "subscription" DROP COLUMN "tier";

-- DropEnum
DROP TYPE "SubscriptionTier";

-- CreateIndex
CREATE INDEX "subscription_tierId_idx" ON "subscription"("tierId");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "pricing_tier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
