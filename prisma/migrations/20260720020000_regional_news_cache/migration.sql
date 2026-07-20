-- CreateTable
CREATE TABLE "regional_news_cache" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_news_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regional_news_cache_municipalityId_key" ON "regional_news_cache"("municipalityId");

-- AddForeignKey
ALTER TABLE "regional_news_cache" ADD CONSTRAINT "regional_news_cache_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
