-- Document host-facing label + optional AI summary
ALTER TABLE "document" ADD COLUMN "label" TEXT;
ALTER TABLE "document" ADD COLUMN "aiSummary" TEXT;
