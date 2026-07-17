import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { PMS_PROVIDERS, isPmsProviderConfigured, type PmsProviderKey } from "@/lib/pms/config";
import { signPmsState } from "@/lib/pms/state";

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!(provider in PMS_PROVIDERS)) {
    return NextResponse.json({ error: "Unknown PMS provider" }, { status: 404 });
  }
  const key = provider as PmsProviderKey;

  if (!isPmsProviderConfigured(key)) {
    return NextResponse.json(
      {
        error: `${PMS_PROVIDERS[key].label} isn't configured on this deployment yet — set ${PMS_PROVIDERS[key].clientIdEnv} and ${PMS_PROVIDERS[key].clientSecretEnv} to enable it.`,
      },
      { status: 501 }
    );
  }

  const session = await requireSession();
  const config = PMS_PROVIDERS[key];
  const redirectUri = `${process.env.BETTER_AUTH_URL}/api/pms/${key}/callback`;

  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set("client_id", process.env[config.clientIdEnv]!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", config.scope);
  authorizeUrl.searchParams.set("state", signPmsState(session.user.id));

  return NextResponse.redirect(authorizeUrl.toString());
}
