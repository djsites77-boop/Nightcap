-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'receipt';

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('advertising', 'insurance', 'interest_mortgage', 'professional_fees', 'management_fees', 'repairs_maintenance', 'supplies', 'property_tax', 'travel', 'utilities', 'cleaning', 'platform_fees', 'other');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('appliance', 'furniture', 'electronics', 'linens_bedding', 'kitchenware', 'safety_equipment', 'outdoor', 'other');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('active', 'needs_repair', 'replaced', 'removed');

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "receiptDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_asset" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'good',
    "status" "InventoryStatus" NOT NULL DEFAULT 'active',
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePriceCents" INTEGER,
    "warrantyExpiryDate" TIMESTAMP(3),
    "locationInProperty" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_receiptDocumentId_key" ON "expense"("receiptDocumentId");

-- CreateIndex
CREATE INDEX "expense_propertyId_incurredOn_idx" ON "expense"("propertyId", "incurredOn");

-- CreateIndex
CREATE INDEX "inventory_asset_propertyId_idx" ON "inventory_asset"("propertyId");

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_asset" ADD CONSTRAINT "inventory_asset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
