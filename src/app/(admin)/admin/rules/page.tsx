import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { NewMunicipalityForm } from "./new-municipality-form";
import { MunicipalityActiveToggle } from "./municipality-active-toggle";

export default async function AdminRulesPage() {
  const municipalities = await prisma.municipality.findMany({
    include: { _count: { select: { complianceRules: true, properties: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Jurisdictions"
        description={
          <>
            Each municipality carries its own rules, applied by the property&apos;s selected
            jurisdiction. Tax rates are editable on{" "}
            <Link href="/admin/tax-rates" className="font-semibold text-accent hover:underline">
              Tax rates
            </Link>
            ; use this page for night caps, fees, occupancy, and other rules.
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="animate-page-in">
          <CardHeader>
            <CardTitle>Municipalities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col pt-2">
            {municipalities.map((m) => (
              <div
                key={m.id}
                className="-mx-1 flex items-center justify-between gap-3 rounded-md border-b border-border px-1 py-3.5 transition-colors last:border-0 hover:bg-accent-soft/30"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/rules/${m.id}`}
                    className="text-sm font-semibold text-foreground hover:text-accent"
                  >
                    {m.name}, {m.province}
                  </Link>
                  <div className="text-xs text-subtle-foreground">
                    {m._count.complianceRules} rules · {m._count.properties} properties
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={m.active ? "ok" : "neutral"}>{m.active ? "Enabled" : "Disabled"}</Badge>
                  <MunicipalityActiveToggle municipalityId={m.id} active={m.active} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit animate-page-in stagger-2">
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
