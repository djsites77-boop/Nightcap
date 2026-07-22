"use server";

import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export async function getPlatformApiKeyPlaintext(keyName: string): Promise<string | null> {
  const key = await prisma.platformApiKey.findFirst({
    where: { keyName },
  });

  if (!key || !key.ciphertext || !key.iv) return null;

  try {
    return decryptSecret({ ciphertext: key.ciphertext, iv: key.iv });
  } catch {
    return null;
  }
}
