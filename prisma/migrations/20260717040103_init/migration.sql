-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('night_cap', 'mat_rate', 'registration_fee', 'occupancy_limit', 'record_retention_years', 'partial_unit_bedroom_cap');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('entire_home', 'partial_unit', 'all');

-- CreateEnum
CREATE TYPE "PropertyUnitType" AS ENUM ('entire_home', 'partial_unit');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('not_registered', 'pending', 'active', 'expired');

-- CreateEnum
CREATE TYPE "CalendarPlatform" AS ENUM ('airbnb', 'vrbo', 'direct');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('connected', 'error', 'disconnected');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ical_import', 'manual', 'csv_import', 'pms_sync');

-- CreateEnum
CREATE TYPE "MatStatus" AS ENUM ('due', 'remitted');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('fire_safety_cert', 'insurance', 'floor_plan', 'other');

-- CreateEnum
CREATE TYPE "PmsProvider" AS ENUM ('hospitable', 'guesty');

-- CreateEnum
CREATE TYPE "PmsConnectionStatus" AS ENUM ('connected', 'error', 'disconnected');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rule" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "value" JSONB NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "unitType" "PropertyUnitType" NOT NULL,
    "bedroomCount" INTEGER NOT NULL,
    "roomsOffered" INTEGER,
    "registrationNumber" TEXT,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'not_registered',
    "registrationIssueDate" TIMESTAMP(3),
    "registrationExpiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "platform" "CalendarPlatform" NOT NULL,
    "icalUrlCiphertext" TEXT NOT NULL,
    "icalUrlIv" TEXT NOT NULL,
    "icalUrlLastFour" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'connected',
    "lastError" TEXT,
    "consecutiveEmptyFetches" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "calendarConnectionId" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "platform" "CalendarPlatform" NOT NULL,
    "grossAmount" DECIMAL(10,2),
    "source" "BookingSource" NOT NULL,
    "externalUid" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "night_tally" (
    "propertyId" TEXT NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "nightsUsed" INTEGER NOT NULL,
    "cap" INTEGER NOT NULL,
    "lastComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "night_tally_pkey" PRIMARY KEY ("propertyId","calendarYear")
);

-- CreateTable
CREATE TABLE "mat_period" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "rateApplied" DECIMAL(5,4) NOT NULL,
    "amountOwed" DECIMAL(12,2) NOT NULL,
    "status" "MatStatus" NOT NULL DEFAULT 'due',
    "remittedAt" TIMESTAMP(3),
    "remittedById" TEXT,

    CONSTRAINT "mat_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_item" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,

    CONSTRAINT "inspection_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms_connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PmsProvider" NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT,
    "refreshTokenIv" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "PmsConnectionStatus" NOT NULL DEFAULT 'connected',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pms_listing_link" (
    "id" TEXT NOT NULL,
    "pmsConnectionId" TEXT NOT NULL,
    "externalListingId" TEXT NOT NULL,
    "propertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pms_listing_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "municipality_name_province_key" ON "municipality"("name", "province");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_rule_municipalityId_ruleType_unitType_effectiveD_key" ON "compliance_rule"("municipalityId", "ruleType", "unitType", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "booking_calendarConnectionId_externalUid_key" ON "booking"("calendarConnectionId", "externalUid");

-- CreateIndex
CREATE UNIQUE INDEX "mat_period_propertyId_periodStart_periodEnd_key" ON "mat_period"("propertyId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_item_propertyId_itemKey_key" ON "inspection_item"("propertyId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "pms_connection_userId_provider_externalAccountId_key" ON "pms_connection"("userId", "provider", "externalAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "pms_listing_link_pmsConnectionId_externalListingId_key" ON "pms_listing_link"("pmsConnectionId", "externalListingId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rule" ADD CONSTRAINT "compliance_rule_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property" ADD CONSTRAINT "property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property" ADD CONSTRAINT "property_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connection" ADD CONSTRAINT "calendar_connection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "night_tally" ADD CONSTRAINT "night_tally_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mat_period" ADD CONSTRAINT "mat_period_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mat_period" ADD CONSTRAINT "mat_period_remittedById_fkey" FOREIGN KEY ("remittedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_item" ADD CONSTRAINT "inspection_item_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_connection" ADD CONSTRAINT "pms_connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_listing_link" ADD CONSTRAINT "pms_listing_link_pmsConnectionId_fkey" FOREIGN KEY ("pmsConnectionId") REFERENCES "pms_connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pms_listing_link" ADD CONSTRAINT "pms_listing_link_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
