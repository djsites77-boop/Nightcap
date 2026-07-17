import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureSubscription, TIER_CONFIG, daysSince } from "@/lib/subscription";
import { PMS_PROVIDERS, isPmsProviderConfigured, type PmsProviderKey } from "@/lib/pms/config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

export default async function SettingsPage() {
  const session = await requireSession();
  const [subscription, propertyCount] = await Promise.all([
    ensureSubscription(session.user.id),
    prisma.property.count({ where: { userId: session.user.id, archivedAt: null } }),
  ]);
  const config = TIER_CONFIG[subscription.tier];
  const estimateCents = config.pricePerPropertyCents * propertyCount;

  const pmsConnections = await prisma.pmsConnection.findMany({ where: { userId: session.user.id } });
  const providerKeys = Object.keys(PMS_PROVIDERS) as PmsProviderKey[];

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">Your account and plan.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-subtle-foreground">Name</span>
              <span className="font-semibold">{session.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle-foreground">Email</span>
              <span className="font-semibold">{session.user.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-subtle-foreground">Tier</span>
              <Badge variant="neutral">{config.label}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle-foreground">Properties</span>
              <span className="font-mono font-semibold tabular-nums">
                {propertyCount}
                {config.propertyLimit !== null ? ` / ${config.propertyLimit}` : " (unlimited)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle-foreground">Rate</span>
              <span className="font-mono font-semibold tabular-nums">
                {fmtMoney(config.pricePerPropertyCents)}/property/mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle-foreground">Est. monthly</span>
              <span className="font-mono font-semibold tabular-nums">{fmtMoney(estimateCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtle-foreground">On this plan</span>
              <span className="font-mono font-semibold tabular-nums">{daysSince(subscription.startedAt)} days</span>
            </div>
            <p className="mt-2 text-xs text-subtle-foreground">
              Self-serve upgrades aren&apos;t wired up yet — contact support to change tiers.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>PMS integrations (Tier 1 revenue sync)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-3 text-sm">
            <p className="text-xs text-subtle-foreground">
              Connect Hospitable or Guesty to pull reservation revenue automatically — no manual entry, no
              CSV. Requires the platform to have real developer credentials configured.
            </p>
            {providerKeys.map((key) => {
              const provider = PMS_PROVIDERS[key];
              const configured = isPmsProviderConfigured(key);
              const connection = pmsConnections.find((c) => c.provider === key);
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5">
                  <div>
                    <div className="font-semibold text-foreground">{provider.label}</div>
                    {connection ? (
                      <Badge variant={connection.status === "connected" ? "ok" : "warning"} className="mt-1">
                        {connection.status}
                      </Badge>
                    ) : !configured ? (
                      <div className="text-xs text-subtle-foreground">
                        Not available yet — needs {provider.clientIdEnv} configured
                      </div>
                    ) : null}
                  </div>
                  <Button size="sm" variant="ghost" disabled={!configured} asChild={configured}>
                    {configured ? <a href={`/api/pms/${key}/connect`}>{connection ? "Reconnect" : "Connect"}</a> : <span>Connect</span>}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
