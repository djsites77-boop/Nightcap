import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { resolveMatRate, type ComplianceRuleRow } from "@/lib/compliance/rules";
import { MatRateForm } from "./mat-rate-form";

function fmtPct(rate: number): string {
  return `${(rate * 100).toLocaleString("en-CA", { maximumFractionDigits: 3 })}%`;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminTaxRatesPage() {
  const municipalities = await prisma.municipality.findMany({
    include: {
      complianceRules: { where: { ruleType: "mat_rate" }, orderBy: { effectiveDate: "asc" } },
      _count: { select: { properties: true } },
    },
    orderBy: [{ province: "asc" }, { name: "asc" }],
  });

  const now = new Date();

  const rows = municipalities.map((m) => {
    const ruleRows: ComplianceRuleRow[] = m.complianceRules.map((r) => ({
      ruleType: r.ruleType,
      unitType: r.unitType,
      value: r.value,
      effectiveDate: r.effectiveDate,
    }));
    const currentRate = resolveMatRate(ruleRows, "entire_home", now);
    const currentRule = m.complianceRules
      .filter((r) => r.effectiveDate.getTime() <= now.getTime())
      .at(-1);
    const upcoming = m.complianceRules.find((r) => r.effectiveDate.getTime() > now.getTime());

    return { m, currentRate, currentRule, upcoming };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Jurisdiction tax rates"
        description={
          <>
            Accommodation tax (MAT / lodging tax / tourism levy) per municipality. Setting a rate
            schedules it from its effective date; each property&apos;s MAT ledger picks up its own
            jurisdiction automatically. Remitted quarters are never rewritten. Night caps and other
            rules live under{" "}
            <Link href="/admin/rules" className="font-semibold text-accent hover:underline">
              Jurisdictions
            </Link>
            .
          </>
        }
      />

      <Card className="animate-page-in overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Jurisdiction</TableHead>
                <TableHead className="text-right">Current rate</TableHead>
                <TableHead>In effect since</TableHead>
                <TableHead>Scheduled change</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Set rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ m, currentRate, currentRule, upcoming }) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/admin/rules/${m.id}`}
                      className="font-semibold text-foreground hover:text-accent"
                    >
                      {m.name}, {m.province}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold tabular-nums">
                    {currentRate != null ? fmtPct(currentRate) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {currentRule ? fmtDate(currentRule.effectiveDate) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {upcoming
                      ? `${fmtPct((upcoming.value as { rate: number }).rate)} from ${fmtDate(upcoming.effectiveDate)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{m._count.properties}</TableCell>
                  <TableCell>
                    <Badge variant={m.active ? "ok" : "neutral"}>{m.active ? "Enabled" : "Disabled"}</Badge>
                  </TableCell>
                  <TableCell>
                    <MatRateForm
                      municipalityId={m.id}
                      currentRatePercent={
                        currentRate != null ? Math.round(currentRate * 10000) / 100 : null
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
