import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getPropertyStatusView } from "@/lib/property-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { NightGauge } from "@/components/night-gauge";
import { MarkRemittedButton } from "@/components/property-detail/mark-remitted-button";
import { RetrySyncButton } from "@/components/property-detail/retry-sync-button";
import { InspectionCheckbox } from "@/components/property-detail/inspection-checkbox";
import { ViewDocumentButton } from "@/components/property-detail/view-document-button";
import { CsvImportForm } from "@/components/property-detail/csv-import-form";
import {
  BookingRevenueForm,
  DocumentUploadForm,
  ManualBookingForm,
  SyncNowButton,
} from "@/components/property-detail/host-actions";
import { ExpenseForm, DeleteExpenseButton, ExportExpensesCsvButton } from "@/components/property-detail/expense-form";
import { InventoryAssetForm, InventoryAssetRowActions } from "@/components/property-detail/inventory-form";
import { ensureMatPeriods, recomputeMatLedger } from "@/lib/mat-ledger";
import { ensureInspectionChecklist } from "@/lib/inspection";
import { resolveEffectiveRule, type ComplianceRuleRow } from "@/lib/compliance/rules";

function fmtMoney(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const ownership = await prisma.property.findUnique({
    where: { id },
    select: { userId: true, municipalityId: true, unitType: true },
  });
  if (!ownership || ownership.userId !== session.user.id) notFound();

  const year = new Date().getUTCFullYear();
  await ensureInspectionChecklist(id);
  await ensureMatPeriods(id, year);
  const { boundaryCrossingBookingIds } = await recomputeMatLedger(id, year);

  const property = await prisma.property.findUniqueOrThrow({
    where: { id },
    include: {
      municipality: true,
      calendarConnections: true,
      bookings: { where: { cancelledAt: null }, orderBy: { checkIn: "asc" } },
      matPeriods: { orderBy: { periodStart: "asc" } },
      inspectionItems: { orderBy: { itemKey: "asc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      expenses: { orderBy: { incurredOn: "desc" } },
      inventoryAssets: { orderBy: { createdAt: "desc" } },
    },
  });

  const view = await getPropertyStatusView(id);
  const erroredConnection = property.calendarConnections.find((c) => c.syncStatus === "error");

  const occupancyRules = await prisma.complianceRule.findMany({
    where: { municipalityId: property.municipalityId, ruleType: "occupancy_limit" },
  });
  const occupancy = resolveEffectiveRule<{ adultsPerBedroom: number }>(
    occupancyRules.map(
      (r): ComplianceRuleRow => ({
        ruleType: r.ruleType,
        unitType: r.unitType,
        value: r.value,
        effectiveDate: r.effectiveDate,
      })
    ),
    { ruleType: "occupancy_limit", unitType: property.unitType, asOf: new Date() }
  );
  const adultsPerBedroom = occupancy?.value.adultsPerBedroom ?? null;
  const boundarySet = new Set(boundaryCrossingBookingIds);
  const activeMatRate =
    property.matPeriods.find((p) => p.status === "due")?.rateApplied ??
    property.matPeriods.at(-1)?.rateApplied;

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All properties
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground">{property.nickname}</h1>
        <Badge variant={view.status}>{view.status}</Badge>
      </div>
      <p className="mb-5 text-sm text-subtle-foreground">
        {property.address} · {property.unitType === "entire_home" ? "Entire home" : "Partial unit"}
      </p>

      {erroredConnection && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-status-warning bg-status-warning-soft p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Sync paused — last fetch returned no events</p>
            <p className="mt-0.5 text-muted-foreground">
              Treated as a feed error, not a mass cancellation. Bookings unchanged since{" "}
              {erroredConnection.lastSyncedAt ? fmtDate(erroredConnection.lastSyncedAt) : "last known good sync"}.
            </p>
            <div className="mt-2">
              <RetrySyncButton calendarConnectionId={erroredConnection.id} />
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mat">MAT Ledger</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {property.unitType === "entire_home"
                      ? `Night cap · ${new Date().getFullYear()}`
                      : "Room-rental cap"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-3">
                  {property.unitType === "entire_home" ? (
                    <>
                      <NightGauge nightsUsed={view.nightsUsed ?? 0} cap={view.cap ?? 1} status={view.status} />
                      <Badge variant={view.status} className="mt-3">
                        {view.status}
                      </Badge>
                    </>
                  ) : (
                    <div className="flex w-full items-center gap-3">
                      <span className="font-mono text-3xl font-semibold tabular-nums">
                        {property.roomsOffered ?? "—"}
                      </span>
                      <span className="text-xs text-subtle-foreground">
                        of {view.bedroomCap ?? "—"} bedrooms allowed
                        <br />({property.bedroomCount}-bedroom unit, max 3 or bedrooms − 1)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Registration</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-3">
                  <Row k="Number" v={property.registrationNumber ?? "—"} />
                  <Row k="Issued" v={property.registrationIssueDate ? fmtDate(property.registrationIssueDate) : "—"} />
                  <Row k="Expires" v={property.registrationExpiryDate ? fmtDate(property.registrationExpiryDate) : "—"} />
                  <Row
                    k="Countdown"
                    v={view.daysToRenewal !== null ? `${view.daysToRenewal} days` : "—"}
                    tone={view.daysToRenewal !== null && view.daysToRenewal < 14 ? "risk" : view.daysToRenewal !== null && view.daysToRenewal < 30 ? "warning" : undefined}
                  />
                  <Advisory>
                    Self-reported — Toronto&apos;s registration API isn&apos;t open to third-party
                    verification, so this tracks the countdown only.
                  </Advisory>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance advisories</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-3">
                  <Advisory>
                    <b>
                      Occupancy
                      {adultsPerBedroom != null ? ` (max ${adultsPerBedroom} adults/bedroom)` : ""}:
                    </b>{" "}
                    not tracked — iCal sync provides dates only, no guest count. Connect a Hospitable
                    or Guesty account to enable this check automatically.
                  </Advisory>
                  <Advisory>
                    Any booking spanning a calendar-year or MAT-period boundary (e.g. a New Year&apos;s stay)
                    is split night-by-night rather than counted entirely toward either period — see the MAT
                    Ledger tab for a worked example when one occurs.
                  </Advisory>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle>Calendar sync</CardTitle>
                  <SyncNowButton propertyId={property.id} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-3">
                  {property.calendarConnections.length === 0 ? (
                    <p className="text-sm text-subtle-foreground">No calendar connected yet.</p>
                  ) : (
                    property.calendarConnections.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{c.platform}</span>
                        <Badge variant={c.syncStatus === "connected" ? "ok" : "warning"}>{c.syncStatus}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mat" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>
                MAT ledger
                {activeMatRate != null
                  ? ` — ${(Number(activeMatRate) * 100).toFixed(1)}% of gross revenue`
                  : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {property.matPeriods.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No MAT periods yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Owed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.matPeriods.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          {fmtDate(m.periodStart)} – {fmtDate(m.periodEnd)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {fmtMoney(Number(m.grossRevenue))}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {(Number(m.rateApplied) * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {fmtMoney(Number(m.amountOwed))}
                        </TableCell>
                        <TableCell>
                          {m.status === "remitted" ? (
                            <div>
                              <Badge variant="ok">Remitted</Badge>
                              {m.remittedAt && (
                                <div className="mt-1 text-[11px] text-subtle-foreground">{fmtDate(m.remittedAt)}</div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="warning">Due</Badge>
                              <MarkRemittedButton matPeriodId={m.id} />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Inspection checklist</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex flex-col">
                {property.inspectionItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                    <InspectionCheckbox itemId={item.id} completed={item.completed} />
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatItemKey(item.itemKey)}
                      </div>
                      <div className="text-xs text-subtle-foreground">
                        {item.completed && item.completedAt ? `Confirmed ${fmtDate(item.completedAt)}` : "Not yet confirmed"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Advisory className="mt-4">
                Occupancy posting is tracked here as a physical-posting requirement; the
                {adultsPerBedroom != null ? ` ${adultsPerBedroom}-adults/bedroom` : ""} occupancy{" "}
                <em>limit</em> itself is informational-only — see Overview.
              </Advisory>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {property.documents.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No documents uploaded yet.</p>
              ) : (
                <div className="flex flex-col">
                  {property.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{doc.fileName}</div>
                        <div className="text-xs text-subtle-foreground">
                          {doc.mimeType} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                          {doc.expiryDate && ` · Expires ${fmtDate(doc.expiryDate)}`}
                        </div>
                      </div>
                      <ViewDocumentButton documentId={doc.id} />
                    </div>
                  ))}
                </div>
              )}
              <DocumentUploadForm propertyId={property.id} />
              <div className="mt-4 flex items-start gap-2 text-xs text-subtle-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                <span>Served via short-lived signed URLs from private storage — not publicly accessible links.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Synced bookings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-3">
              <ManualBookingForm propertyId={property.id} />
              <CsvImportForm propertyId={property.id} />
              {property.bookings.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No bookings yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead className="text-right">Nights</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono tabular-nums">
                          {fmtDate(b.checkIn)}
                          {boundarySet.has(b.id) ? (
                            <div className="mt-1 text-[11px] text-status-warning">
                              Crosses MAT period — review proration
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{fmtDate(b.checkOut)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{b.nights}</TableCell>
                        <TableCell className="capitalize">{b.platform}</TableCell>
                        <TableCell>{b.source.replace("_", " ")}</TableCell>
                        <TableCell className="text-right">
                          <BookingRevenueForm
                            bookingId={b.id}
                            grossAmount={b.grossAmount != null ? Number(b.grossAmount) : null}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Expenses</CardTitle>
              <ExportExpensesCsvButton propertyId={property.id} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-3">
              <ExpenseForm propertyId={property.id} />
              {property.expenses.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No expenses logged yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono tabular-nums">{fmtDate(e.incurredOn)}</TableCell>
                        <TableCell className="capitalize">{e.category.replace(/_/g, " ")}</TableCell>
                        <TableCell>{e.description}</TableCell>
                        <TableCell>{e.vendorName ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {fmtMoney(e.amountCents / 100)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeleteExpenseButton expenseId={e.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Advisory>
                Nightcap tracks and categorizes expenses so they&apos;re organized for tax time — it does
                not file or remit anything on your behalf. Export the CSV and hand it to your accountant
                or import it into your tax software.
              </Advisory>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-3">
              <InventoryAssetForm propertyId={property.id} />
              {property.inventoryAssets.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No inventory items yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Condition / status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.inventoryAssets.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{a.name}</div>
                          {(a.brand || a.model) && (
                            <div className="text-xs text-subtle-foreground">
                              {[a.brand, a.model].filter(Boolean).join(" ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{a.category.replace(/_/g, " ")}</TableCell>
                        <TableCell>{a.locationInProperty ?? "—"}</TableCell>
                        <TableCell>
                          <InventoryAssetRowActions assetId={a.id} condition={a.condition} status={a.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "risk" | "warning" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-subtle-foreground">{k}</span>
      <span
        className={`font-mono font-semibold tabular-nums ${
          tone === "risk" ? "text-status-risk" : tone === "warning" ? "text-status-warning" : "text-foreground"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function Advisory({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface-alt p-3 text-xs text-muted-foreground ${className}`}>
      <Info className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" />
      <span>{children}</span>
    </div>
  );
}

function formatItemKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
