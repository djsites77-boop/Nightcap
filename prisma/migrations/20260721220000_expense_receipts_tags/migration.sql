-- Expense ownership + general (no property) expenses
ALTER TABLE "expense" ADD COLUMN "userId" TEXT;
UPDATE "expense" e
SET "userId" = p."userId"
FROM "property" p
WHERE e."propertyId" = p."id";
ALTER TABLE "expense" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "expense" ALTER COLUMN "propertyId" DROP NOT NULL;
ALTER TABLE "expense" ADD COLUMN "notes" TEXT;
ALTER TABLE "expense" ADD COLUMN "warrantyExpiryDate" TIMESTAMP(3);

ALTER TABLE "expense" ADD CONSTRAINT "expense_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "expense_userId_incurredOn_idx" ON "expense"("userId", "incurredOn");

-- Documents may be host-level (general expense receipts)
ALTER TABLE "document" ALTER COLUMN "propertyId" DROP NOT NULL;

-- Smart tags
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tag_userId_name_key" ON "tag"("userId", "name");

ALTER TABLE "tag" ADD CONSTRAINT "tag_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "expense_tag" (
    "expenseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "expense_tag_pkey" PRIMARY KEY ("expenseId","tagId")
);

ALTER TABLE "expense_tag" ADD CONSTRAINT "expense_tag_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_tag" ADD CONSTRAINT "expense_tag_tagId_fkey"
  FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inventory ↔ purchase expense / receipt
ALTER TABLE "inventory_asset" ADD COLUMN "purchaseExpenseId" TEXT;
ALTER TABLE "inventory_asset" ADD COLUMN "purchaseDocumentId" TEXT;

CREATE UNIQUE INDEX "inventory_asset_purchaseExpenseId_key" ON "inventory_asset"("purchaseExpenseId");
CREATE UNIQUE INDEX "inventory_asset_purchaseDocumentId_key" ON "inventory_asset"("purchaseDocumentId");

ALTER TABLE "inventory_asset" ADD CONSTRAINT "inventory_asset_purchaseExpenseId_fkey"
  FOREIGN KEY ("purchaseExpenseId") REFERENCES "expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_asset" ADD CONSTRAINT "inventory_asset_purchaseDocumentId_fkey"
  FOREIGN KEY ("purchaseDocumentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
