-- Platform admin API keys (encrypted at rest)
CREATE TABLE "platform_api_key" (
    "id" TEXT NOT NULL,
    "keyName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_api_key_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_api_key_keyName_key" ON "platform_api_key"("keyName");
