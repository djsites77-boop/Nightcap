import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TierSelect } from "@/components/admin/tier-select";
import { daysSince, TIER_CONFIG } from "@/lib/subscription";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "host" },
    include: { subscription: true, properties: { where: { archivedAt: null }, select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Users</h1>
      <p className="mb-6 text-sm text-muted-foreground">{users.length} hosts.</p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Days subscribed</TableHead>
                <TableHead className="text-right">Signed up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const tier = u.subscription?.tier ?? "free";
                const startedAt = u.subscription?.startedAt ?? u.createdAt;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {u.properties.length}
                      {TIER_CONFIG[tier].propertyLimit !== null && ` / ${TIER_CONFIG[tier].propertyLimit}`}
                    </TableCell>
                    <TableCell>
                      <TierSelect userId={u.id} currentTier={tier} />
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
