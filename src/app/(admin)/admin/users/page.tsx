import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TierSelect } from "@/components/admin/tier-select";
import { PageHeader } from "@/components/ui/page-header";
import { daysSince, listActiveTiers } from "@/lib/subscription";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });
}

export default async function AdminUsersPage() {
  const [users, tiers] = await Promise.all([
    prisma.user.findMany({
      where: { role: "host" },
      include: {
        subscription: { include: { tier: true } },
        properties: { where: { archivedAt: null }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    listActiveTiers(),
  ]);

  const tierOptions = tiers.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    propertyLimit: t.propertyLimit,
    pricePerPropertyCents: t.pricePerPropertyCents,
  }));

  const totalMonthlyCents = users.reduce(
    (sum, u) => sum + (u.subscription?.pricePerPropertyCents ?? 0) * u.properties.length,
    0
  );

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Users"
        description={
          <>
            {users.length} hosts · {fmtMoney(totalMonthlyCents)}/mo estimated. Prices shown are each
            host&apos;s snapshotted rate — re-assign a tier to apply catalog changes.
          </>
        }
      />

      <Card className="animate-page-in overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Est. monthly</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Signed up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const sub = u.subscription;
                const startedAt = sub?.startedAt ?? u.createdAt;
                const rateCents = sub?.pricePerPropertyCents ?? 0;
                const monthlyCents = rateCents * u.properties.length;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {u.properties.length}
                      {sub?.propertyLimit != null && ` / ${sub.propertyLimit}`}
                    </TableCell>
                    <TableCell>
                      <TierSelect userId={u.id} currentTierId={sub?.tierId ?? null} tiers={tierOptions} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {sub ? `${fmtMoney(rateCents)}/prop` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold tabular-nums">
                      {sub ? fmtMoney(monthlyCents) : "—"}
                    </TableCell>
                    <TableCell>
                      {sub ? (
                        <Badge variant={sub.status === "active" ? "ok" : "neutral"}>{sub.status}</Badge>
                      ) : (
                        <Badge variant="neutral">none</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{daysSince(startedAt)}d</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {u.createdAt.toLocaleDateString("en-CA")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
