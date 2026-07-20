import { NextRequest, NextResponse } from "next/server";
import { originFromRequest } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { PMS_PROVIDERS, type PmsProviderKey } from "@/lib/pms/config";
import { verifyPmsState } from "@/lib/pms/state";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  account_id?: string;
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!(provider in PMS_PROVIDERS)) {
    return NextResponse.json({ error: "Unknown PMS provider" }, { status: 404 });
  }
  const key = provider as PmsProviderKey;
  const config = PMS_PROVIDERS[key];

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?pms_error=missing_code", request.url));
  }

  const verified = verifyPmsState(state);
  if (!verified) {
    return NextResponse.redirect(new URL("/settings?pms_error=invalid_state", request.url));
  }

  const redirectUri = `${originFromRequest(request)}/api/pms/${key}/callback`;
  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env[config.clientIdEnv] ?? "",
      client_secret: process.env[config.clientSecretEnv] ?? "",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/settings?pms_error=token_exchange_failed", request.url));
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const encryptedAccess = encryptSecret(tokens.access_token);
  const encryptedRefresh = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;

  await prisma.pmsConnection.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId: verified.userId,
        provider: key,
        externalAccountId: tokens.account_id ?? "default",
      },
    },
    create: {
      userId: verified.userId,
      provider: key,
      externalAccountId: tokens.account_id ?? "default",
      accessTokenCiphertext: encryptedAccess.ciphertext,
      accessTokenIv: encryptedAccess.iv,
      refreshTokenCiphertext: encryptedRefresh?.ciphertext,
      refreshTokenIv: encryptedRefresh?.iv,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      status: "connected",
    },
    update: {
      accessTokenCiphertext: encryptedAccess.ciphertext,
      accessTokenIv: encryptedAccess.iv,
      refreshTokenCiphertext: encryptedRefresh?.ciphertext,
      refreshTokenIv: encryptedRefresh?.iv,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      status: "connected",
      lastError: null,
    },
  });

  return NextResponse.redirect(new URL("/settings?pms_connected=" + key, request.url));
}
