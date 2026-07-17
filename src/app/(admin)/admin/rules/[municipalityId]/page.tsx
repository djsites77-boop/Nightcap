import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RuleForm } from "./rule-form";

export default async function MunicipalityRulesPage({
  params,
}: {
  params: Promise<{ municipalityId: string }>;
}) {
  const { municipalityId } = await params;
  const municipality = await prisma.municipality.findUnique({
    where: { id: municipalityId },
    include: { complianceRules: { orderBy: [{ ruleType: "asc" }, { effectiveDate: "desc" }] } },
  });
  if (!municipality) notFound();

  return (
    <div>
      <Link
        href="/admin/rules"
        className="mb-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All jurisdictions
      </Link>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">
        {municipality.name}, {municipality.province}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {municipality.active ? "Enabled" : "Disabled"} · {municipality.complianceRules.length} rules
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Current rules</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {municipality.complianceRules.length === 0 ? (
              <p className="text-sm text-subtle-foreground">No rules configured yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Unit type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {municipality.complianceRules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.ruleType.replace(/_/g, " ")}</TableCell>
                      <TableCell className="capitalize">{r.unitType.replace(/_/g, " ")}</TableCell>
                      <TableCell className="font-mono text-xs">{JSON.stringify(r.value)}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {r.effectiveDate.toLocaleDateString("en-CA")}
                      </TableCell>
                      <TableCell>
                        {r.sourceUrl ? (
                          <a
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent underline"
                          >
                            link
                          </a>
                        ) : (
                          <span className="text-xs text-subtle-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add / update a rule</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <RuleForm municipalityId={municipality.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
