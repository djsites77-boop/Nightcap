/**
 * Tier 1 PMS OAuth config (spec §5b). Authorize/token URLs below are the
 * standard OAuth 2.0 Authorization Code shape both platforms document
 * publicly as of spec-writing time — [VERIFY] against each platform's
 * current developer docs directly before going live, per the spec's own
 * instruction: these can change, and this build has not been tested against
 * a real Hospitable/Guesty account.
 */

export type PmsProviderKey = "hospitable" | "guesty";

export interface PmsProviderConfig {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scope: string;
}

export const PMS_PROVIDERS: Record<PmsProviderKey, PmsProviderConfig> = {
  hospitable: {
    label: "Hospitable",
    // [VERIFY]: https://developer.hospitable.com — current OAuth endpoints.
    authorizeUrl: "https://connect.hospitable.com/oauth/authorize",
    tokenUrl: "https://connect.hospitable.com/oauth/token",
    clientIdEnv: "HOSPITABLE_CLIENT_ID",
    clientSecretEnv: "HOSPITABLE_CLIENT_SECRET",
    scope: "reservations:read",
  },
  guesty: {
    label: "Guesty",
    // [VERIFY]: https://open-api-docs.guesty.com — current OAuth endpoints.
    authorizeUrl: "https://booking.guesty.com/oauth2/authorize",
    tokenUrl: "https://open-api.guesty.com/oauth2/token",
    clientIdEnv: "GUESTY_CLIENT_ID",
    clientSecretEnv: "GUESTY_CLIENT_SECRET",
    scope: "open-api",
  },
};

export function isPmsProviderConfigured(provider: PmsProviderKey): boolean {
  const config = PMS_PROVIDERS[provider];
  return Boolean(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]);
}
