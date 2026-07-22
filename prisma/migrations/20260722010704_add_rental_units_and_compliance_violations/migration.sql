-- CreateEnum
CREATE TYPE "ComplianceViolationType" AS ENUM ('EXCEEDS_NIGHT_CAP', 'EXCEEDS_BEDROOM_CAP', 'MISSING_RENEWAL', 'OVERDUE_INSPECTION', 'EXCEEDS_OCCUPANCY_LIMIT');

-- AlterTable
ALTER TABLE "calendar_connection" ADD COLUMN     "rentalUnitId" TEXT,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "rental_unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomsOffered" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_violation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "violationType" "ComplianceViolationType" NOT NULL,
    "value" DOUBLE PRECISION,
    "limit" DOUBLE PRECISION,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_violation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_unit_propertyId_idx" ON "rental_unit"("propertyId");

-- CreateIndex
CREATE INDEX "compliance_violation_propertyId_idx" ON "compliance_violation"("propertyId");

-- CreateIndex
CREATE INDEX "compliance_violation_createdAt_idx" ON "compliance_violation"("createdAt");

-- AddForeignKey
ALTER TABLE "rental_unit" ADD CONSTRAINT "rental_unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connection" ADD CONSTRAINT "calendar_connection_rentalUnitId_fkey" FOREIGN KEY ("rentalUnitId") REFERENCES "rental_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_violation" ADD CONSTRAINT "compliance_violation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
