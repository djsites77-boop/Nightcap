import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, Building2, FolderOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentListItem } from "@/components/documents/document-list-item";
import { cn } from "@/lib/utils";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const session = await requireSession();
  const { property: filterPropertyId } = await searchParams;

  const [properties, documents] = await Promise.all([
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, nickname: true },
      orderBy: { nickname: "asc" },
    }),
    prisma.document.findMany({
      where: {
        OR: [
          { property: { userId: session.user.id, archivedAt: null } },
          { expense: { userId: session.user.id } },
        ],
      },
      include: { property: { select: { id: true, nickname: true } } },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  const filtered =
    filterPropertyId === "general"
      ? documents.filter((d) => !d.propertyId)
      : filterPropertyId
        ? documents.filter((d) => d.propertyId === filterPropertyId)
        : documents;

  const byProperty = new Map<string, typeof filtered>();
  for (const d of filtered) {
    const key = d.propertyId ?? "__general__";
    const list = byProperty.get(key) ?? [];
    list.push(d);
    byProperty.set(key, list);
  }

  const sections: { key: string; title: string; href: string | null; docs: typeof filtered }[] = [];
  for (const p of properties) {
    const docs = byProperty.get(p.id);
    if (!docs?.length) continue;
    sections.push({
      key: p.id,
      title: p.nickname,
      href: `/properties/${p.id}?tab=documents`,
      docs,
    });
  }
  const general = byProperty.get("__general__");
  if (general?.length) {
    sections.push({
      key: "general",
      title: "General",
      href: null,
      docs: general,
    });
  }

  const expiredCount = documents.filter(
    (d) => d.expiryDate != null && d.expiryDate < new Date()
  ).length;

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Insurance, licences, floor plans, and receipts — organized by listing."
      />

      {documents.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <FilterChip href="/documents" active={!filterPropertyId}>
            All ({documents.length})
          </FilterChip>
          {properties.map((p) => {
            const count = documents.filter((d) => d.propertyId === p.id).length;
            if (count === 0) return null;
            return (
              <FilterChip
                key={p.id}
                href={`/documents?property=${p.id}`}
                active={filterPropertyId === p.id}
              >
                {p.nickname} ({count})
              </FilterChip>
            );
          })}
          {documents.some((d) => !d.propertyId) ? (
            <FilterChip
              href="/documents?property=general"
              active={filterPropertyId === "general"}
            >
              General ({documents.filter((d) => !d.propertyId).length})
            </FilterChip>
          ) : null}
          {expiredCount > 0 ? (
            <span className="ml-auto self-center text-xs font-bold text-status-risk">
              {expiredCount} expired
            </span>
          ) : null}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <FolderOpen className="size-6" />
            </div>
            <p className="text-lg font-extrabold">No documents yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open a listing → Docs tab to upload insurance, registration, floor plans, and more.
              Receipts from Costs also show up here.
            </p>
            {properties[0] ? (
              <Link
                href={`/properties/${properties[0].id}?tab=documents`}
                className="mt-1 text-sm font-bold text-accent hover:underline"
              >
                Go to {properties[0].nickname} docs
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No documents in this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center gap-2 px-0.5">
                <Building2 className="size-4 text-muted-foreground" strokeWidth={2} />
                {section.href ? (
                  <Link
                    href={section.href}
                    className="text-sm font-extrabold text-foreground hover:underline"
                  >
                    {section.title}
                  </Link>
                ) : (
                  <h2 className="text-sm font-extrabold text-foreground">{section.title}</h2>
                )}
                <span className="text-xs font-semibold text-muted-foreground">
                  {section.docs.length} file{section.docs.length === 1 ? "" : "s"}
                </span>
                {!section.href ? (
                  <span className="text-xs text-muted-foreground">· host-level / expense receipts</span>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {section.docs.map((d) => (
                  <DocumentListItem
                    key={d.id}
                    doc={d}
                    showProperty={false}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {documents.length > 0 ? (
        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <FileText className="mt-0.5 size-3.5 shrink-0" />
          Allowed uploads: PDF, images (PNG/JPG/WEBP/GIF/HEIC), CSV, Word, Excel — max 8MB.
          Executables and scripts are blocked.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full px-3.5 text-xs font-bold transition-colors",
        active
          ? "bg-brand text-brand-foreground"
          : "bg-surface-alt text-muted-foreground hover:bg-brand-soft hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
