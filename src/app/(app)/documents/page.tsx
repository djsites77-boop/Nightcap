import Link from "next/link";
import { FileText, Shield, Home } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

export default async function DocumentsPage() {
  const session = await requireSession();
  const documents = await prisma.document.findMany({
    where: { property: { userId: session.user.id, archivedAt: null } },
    include: { property: { select: { id: true, nickname: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Insurance, fire safety, floor plans — across every listing."
      />

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <FileText className="size-6" />
            </div>
            <p className="text-lg font-extrabold">Nothing uploaded yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open a listing and add files from its Documents section.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documents.map((d) => {
            const expired = d.expiryDate != null && d.expiryDate < now;
            const soon =
              d.expiryDate != null &&
              !expired &&
              (d.expiryDate.getTime() - now.getTime()) / (86400000) <= 30;
            return (
              <Link key={d.id} href={`/properties/${d.property.id}`}>
                <Card className="h-full transition-transform hover:-translate-y-0.5 hover:shadow-lift">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                      {d.docType.includes("insurance") ? (
                        <Shield className="size-5" />
                      ) : d.docType.includes("floor") ? (
                        <Home className="size-5" />
                      ) : (
                        <FileText className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-foreground">{d.fileName}</p>
                      <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                        {d.property.nickname} · {d.docType.replace(/_/g, " ")}
                      </p>
                      <div className="mt-2">
                        {d.expiryDate ? (
                          <Badge variant={expired ? "risk" : soon ? "warning" : "ok"}>
                            {expired
                              ? "Expired"
                              : soon
                                ? `Expires ${d.expiryDate.toLocaleDateString("en-CA")}`
                                : `Until ${d.expiryDate.toLocaleDateString("en-CA")}`}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" dot={false}>
                            No expiry
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
