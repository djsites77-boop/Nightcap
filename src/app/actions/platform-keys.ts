"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { verifyPassword } from "better-auth/crypto";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  deletePlatformApiKeyRecord,
  getPlatformApiKeyPlaintext,
  isPlatformApiKeyName,
  PLATFORM_API_KEY_DEFS,
  upsertPlatformApiKeyRecord,
  type PlatformApiKeyName,
} from "@/lib/platform-keys";

async function assertAdminPassword(userId: string, password: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { password: true },
  });
  if (!account?.password) {
    throw new Error(
      "Your admin account has no password (e.g. Google sign-in only). Set an email/password on the account before revealing keys."
    );
  }
  const ok = await verifyPassword({ hash: account.password, password });
  if (!ok) throw new Error("Incorrect password");
}

const keyNameSchema = z.string().refine(isPlatformApiKeyName, "Unknown key");

export async function savePlatformApiKey(formData: FormData) {
  const session = await requireAdmin();
  const keyName = keyNameSchema.parse(formData.get("keyName"));
  const value = z.string().trim().min(1, "Paste an API key").parse(formData.get("value"));
  const def = PLATFORM_API_KEY_DEFS.find((d) => d.keyName === keyName)!;

  await upsertPlatformApiKeyRecord(keyName, value, def.label);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "platform_api_key_saved",
      payload: { keyName },
    },
  });

  revalidatePath("/admin/keys");
}

export async function clearPlatformApiKey(keyName: PlatformApiKeyName) {
  const session = await requireAdmin();
  if (!isPlatformApiKeyName(keyName)) throw new Error("Unknown key");

  await deletePlatformApiKeyRecord(keyName);

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "platform_api_key_cleared",
      payload: { keyName },
    },
  });

  revalidatePath("/admin/keys");
}

/** Re-auth with password, then return the plaintext key once for display. */
export async function revealPlatformApiKey(
  keyName: PlatformApiKeyName,
  password: string
): Promise<{ value: string }> {
  const session = await requireAdmin();
  if (!isPlatformApiKeyName(keyName)) throw new Error("Unknown key");

  await assertAdminPassword(session.user.id, password);

  const value = await getPlatformApiKeyPlaintext(keyName);
  if (!value) throw new Error("No key stored yet");

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "platform_api_key_revealed",
      payload: { keyName },
    },
  });

  return { value };
}
