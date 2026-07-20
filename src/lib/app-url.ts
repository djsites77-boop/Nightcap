import "server-only";

/** Default origin when no request is available (cron, scripts, signed URLs). */
export function defaultAppOrigin(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3500").replace(/\/$/, "");
}

/** Resolve the public origin from an incoming request (localhost or ngrok). */
export function originFromRequest(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("host");
  if (!host) return defaultAppOrigin();

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Better Auth dynamic baseURL — accepts localhost, LAN IP, and ngrok on the same dev server. */
export function authBaseURLConfig() {
  const fallback = defaultAppOrigin();
  const allowedHosts = new Set<string>(["localhost:3500", "127.0.0.1:3500"]);

  try {
    allowedHosts.add(new URL(fallback).host);
  } catch {
    // ignore malformed BETTER_AUTH_URL
  }

  const ngrokDomain = process.env.NGROK_DOMAIN?.trim();
  if (ngrokDomain) {
    allowedHosts.add(ngrokDomain);
    allowedHosts.add("*.ngrok.app");
  }

  for (const entry of process.env.BETTER_AUTH_ALLOWED_HOSTS?.split(",") ?? []) {
    const host = entry.trim();
    if (host) allowedHosts.add(host);
  }

  return {
    allowedHosts: [...allowedHosts],
    fallback,
    protocol: "auto" as const,
  };
}
