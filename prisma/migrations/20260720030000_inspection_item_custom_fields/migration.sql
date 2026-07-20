-- AlterTable
ALTER TABLE "inspection_item"
  ADD COLUMN "isCustom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "label" TEXT,
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;
