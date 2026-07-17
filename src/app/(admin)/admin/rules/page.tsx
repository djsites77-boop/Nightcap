import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewMunicipalityForm } from "./new-municipality-form";
import { MunicipalityActiveToggle } from "./municipality-active-toggle";

export default async function AdminRulesPage() {
  const municipalities = await prisma.municipality.findMany({
    include: { _count: { select: { complianceRules: true, properties: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Jurisdictions</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Unlimited municipalities supported — each carries its own compliance rules, applied by the
        property&apos;s selected jurisdiction. Ontario only is seeded today; add more as you expand.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Municipalities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col pt-3">
            {municipalities.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div>
                  <Link href={`/admin/rules/${m.id}`} className="text-sm font-semibold text-foreground hover:text-accent">
                    {m.name}, {m.province}
                  </Link>
                  <div className="text-xs text-subtle-foreground">
                    {m._count.complianceRules} rules · {m._count.properties} properties
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={m.active ? "ok" : "neutral"}>{m.active ? "Enabled" : "Disabled"}</Badge>
                  <MunicipalityActiveToggle municipalityId={m.id} active={m.active} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add municipality</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <NewMunicipalityForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
