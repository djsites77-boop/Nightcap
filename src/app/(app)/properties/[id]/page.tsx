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
  CoverPhotoForm,
  RegistrationProofForm,
} from "@/components/property-detail/host-actions";
import { ExpenseForm, DeleteExpenseButton, ExportExpensesCsvButton } from "@/components/property-detail/expense-form";
import { InventoryAssetForm, InventoryAssetRowActions } from "@/components/property-detail/inventory-form";
import {
  CustomChecklistItemForm,
  DeleteChecklistItemButton,
} from "@/components/property-detail/custom-checklist-item-form";
import { ensureMatPeriods, recomputeMatLedger } from "@/lib/mat-ledger";
import { ensureInspectionChecklist } from "@/lib/inspection";
import { resolveEffectiveRule, type ComplianceRuleRow } from "@/lib/compliance/rules";
import { ensurePropertyLocation } from "@/lib/property-location";
import { resolvePropertyThumbUrl } from "@/lib/property-thumb";
import { PropertyThumb } from "@/components/property-thumb";
import { PropertyMapEmbed, PropertyMapPlaceholder } from "@/components/property-map-embed";
import {
  accommodationTaxShortLabel,
} from "@/lib/accommodation-tax";

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
  await ensurePropertyLocation(id);
  const { boundaryCrossingBookingIds } = await recomputeMatLedger(id, year);

  const property = await prisma.property.findUniqueOrThrow({
    where: { id },
    include: {
      municipality: true,
      calendarConnections: true,
      bookings: { where: { cancelledAt: null }, orderBy: { checkIn: "asc" } },
      matPeriods: { orderBy: { periodStart: "asc" } },
      inspectionItems: { orderBy: [{ isCustom: "asc" }, { itemKey: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" } },
      expenses: { orderBy: { incurredOn: "desc" } },
      inventoryAssets: { orderBy: { createdAt: "desc" } },
    },
  });

  const view = await getPropertyStatusView(id);
  const thumb = await resolvePropertyThumbUrl(property);
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
  const taxLabel = accommodationTaxShortLabel(property.municipality.province);
  const cityName = property.municipality.name;
  const addressAlreadyNamesCity = property.address
    .toLowerCase()
    .includes(cityName.toLowerCase());
  const locationLine = [
    property.address,
    property.unitType === "entire_home" ? "Entire home" : "Partial unit",
    addressAlreadyNamesCity ? null : cityName,
  ]
    .filter(Boolean)
    .join(" · ");

  const registrationDocs = property.documents.filter((d) => d.docType === "registration");
  const hasCoverPhoto = thumb?.kind === "photo";

  const statusCopy =
    view.status === "ok" ? "Looking good" : view.status === "warning" ? "Keep an eye on this" : "Needs you now";

  return (
    <div>
      <Link
        href="/properties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Properties
      </Link>

      <div className="mb-6 overflow-hidden rounded-3xl glass">
        {hasCoverPhoto ? (
          <PropertyThumb
            src={thumb?.src ?? null}
            kind={thumb?.kind ?? null}
            alt={property.nickname}
            className="aspect-[21/9] w-full sm:aspect-[2.4/1]"
          />
        ) : property.latitude != null && property.longitude != null ? (
          <PropertyMapEmbed
            latitude={property.latitude}
            longitude={property.longitude}
            label={property.nickname}
            className="aspect-[21/9] w-full sm:aspect-[2.4/1]"
          />
        ) : (
          <PropertyMapPlaceholder className="aspect-[21/9] w-full sm:aspect-[2.4/1]" />
        )}
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {property.nickname}
            </h1>
            <Badge variant={view.status}>{statusCopy}</Badge>
          </div>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            {locationLine}
          </p>
          <CoverPhotoForm propertyId={property.id} hasCover={hasCoverPhoto} />
        </div>
      </div>

      {hasCoverPhoto && property.latitude != null && property.longitude != null && (
        <Card className="mb-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PropertyMapEmbed
              latitude={property.latitude}
              longitude={property.longitude}
              label={property.nickname}
              className="aspect-[16/9] w-full sm:aspect-[2.2/1]"
            />
          </CardContent>
        </Card>
      )}

      {erroredConnection && (
        <div className="mb-4 flex items-start gap-3 rounded-3xl border border-status-warning/40 bg-status-warning-soft p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <div className="text-sm">
            <p className="font-bold text-foreground">Calendar sync paused</p>
            <p className="mt-0.5 text-muted-foreground">
              Last fetch returned no events — bookings unchanged since{" "}
              {erroredConnection.lastSyncedAt ? fmtDate(erroredConnection.lastSyncedAt) : "the last good sync"}.
            </p>
            <div className="mt-2">
              <RetrySyncButton calendarConnectionId={erroredConnection.id} />
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="min-w-0">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mat">Tax</TabsTrigger>
          <TabsTrigger value="checklist">
            <span className="sm:hidden">List</span>
            <span className="hidden sm:inline">Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="documents">Docs</TabsTrigger>
          <TabsTrigger value="bookings">
            <span className="sm:hidden">Stays</span>
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="expenses">Costs</TabsTrigger>
          <TabsTrigger value="inventory">Items</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {property.unitType === "entire_home"
                      ? `Night cap · ${new Date().getFullYear()}`
                      : "Room-rental cap"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-4 pb-6">
                  {property.unitType === "entire_home" ? (
                    <NightGauge
                      nightsUsed={view.nightsUsed ?? 0}
                      cap={view.cap ?? 1}
                      status={view.status}
                      size="lg"
                    />
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-5xl font-extrabold tabular-nums">{property.roomsOffered ?? "—"}</p>
                      <p className="mt-2 text-sm font-semibold text-muted-foreground">
                        of {view.bedroomCap ?? "—"} bedrooms allowed
                      </p>
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
                    The countdown uses the expiry date you entered — we can&apos;t check with{" "}
                    {cityName} whether your registration is still valid. Upload your confirmation
                    below (or in Docs) so you have proof on file.
                  </Advisory>
                  {registrationDocs.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-surface-alt/40 px-3 py-2.5">
                      <p className="text-xs font-semibold text-muted-foreground">Registration proof on file</p>
                      <ul className="mt-1.5 space-y-1">
                        {registrationDocs.map((doc) => (
                          <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-semibold">{doc.fileName}</span>
                            <ViewDocumentButton documentId={doc.id} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <RegistrationProofForm propertyId={property.id} />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance advisories</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Built from {cityName} rules on this listing — not generic city copy.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-3">
                  <Advisory>
                    <b>
                      Occupancy
                      {adultsPerBedroom != null ? ` (max ${adultsPerBedroom} adults/bedroom)` : ""}:
                    </b>{" "}
                    {adultsPerBedroom != null
                      ? "from this municipality's occupancy rule. "
                      : "no occupancy rule configured for this municipality yet. "}
                    Calendar sync gives stay dates only — not guest counts — so Nitecap can&apos;t
                    auto-check this.
                  </Advisory>
                  <Advisory>
                    Any booking spanning a calendar-year or {taxLabel}-period boundary (e.g. a New
                    Year&apos;s stay) is split night-by-night rather than counted entirely toward either
                    period — see the Tax tab for a worked example when one occurs.
                  </Advisory>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Calendar sync</CardTitle>
                  <SyncNowButton propertyId={property.id} />
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-3">
                  {property.calendarConnections.length === 0 ? (
                    <p className="text-sm text-subtle-foreground">
                      Connect an iCal URL once for this listing. After that, Nitecap refreshes it on a
                      schedule — you only tap sync when you want an immediate pull.
                    </p>
                  ) : (
                    <>
                      {property.calendarConnections.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <span className="capitalize font-semibold text-foreground">{c.platform}</span>
                            {c.lastSyncedAt ? (
                              <p className="text-xs text-muted-foreground">
                                Last synced {fmtDate(c.lastSyncedAt)}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={c.syncStatus === "connected" ? "ok" : "warning"}>
                            {c.syncStatus}
                          </Badge>
                        </div>
                      ))}
                      <p className="text-xs leading-snug text-muted-foreground">
                        One connection per listing is enough. Background sync keeps bookings current;
                        use Sync this listing only when you need a refresh now. From Properties you can
                        sync your whole portfolio at once.
                      </p>
                    </>
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
                {taxLabel} ledger
                {activeMatRate != null
                  ? ` — ${(Number(activeMatRate) * 100).toFixed(1)}% of gross revenue`
                  : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {property.matPeriods.length === 0 ? (
                <p className="text-sm text-subtle-foreground">No {taxLabel} periods yet.</p>
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
            <CardContent className="flex flex-col gap-4 pt-3">
              <div className="flex flex-col">
                {property.inspectionItems.map((item) => {
                  const label = item.isCustom ? (item.label ?? "Custom item") : formatItemKey(item.itemKey);
                  const overdue = !item.completed && item.dueDate && item.dueDate.getTime() < Date.now();
                  const dueSoon =
                    !item.completed &&
                    !overdue &&
                    item.dueDate &&
                    item.dueDate.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000;
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <InspectionCheckbox itemId={item.id} completed={item.completed} />
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {label}
                            {!item.required && (
                              <span className="text-[10px] font-normal text-subtle-foreground">(optional)</span>
                            )}
                          </div>
                          <div className="text-xs text-subtle-foreground">
                            {item.completed && item.completedAt
                              ? `Confirmed ${fmtDate(item.completedAt)}`
                              : item.dueDate
                                ? `Due ${fmtDate(item.dueDate)}`
                                : "Not yet confirmed"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-9 sm:pl-0">
                        {overdue && <Badge variant="risk">Overdue</Badge>}
                        {dueSoon && <Badge variant="warning">Due soon</Badge>}
                        {item.isCustom && <DeleteChecklistItemButton itemId={item.id} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <CustomChecklistItemForm propertyId={property.id} />
              <Advisory>
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
                    <div key={doc.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
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
                              Crosses {taxLabel} period — review proration
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                Nitecap tracks and categorizes expenses so they&apos;re organized for tax time — it does
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
    <div className={`flex items-start gap-2 rounded-2xl border border-dashed border-border-strong bg-surface-alt/80 p-3.5 text-xs leading-relaxed text-muted-foreground ${className}`}>
      <Info className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" />
      <span>{children}</span>
    </div>
  );
}

function formatItemKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
