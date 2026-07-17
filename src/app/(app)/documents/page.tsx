import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

export default async function DocumentsPage() {
  const session = await requireSession();
  const documents = await prisma.document.findMany({
    where: { property: { userId: session.user.id, archivedAt: null } },
    include: { property: { select: { id: true, nickname: true } } },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-foreground">Documents</h1>
      <p className="mb-6 text-sm text-muted-foreground">Across all your properties.</p>

      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="p-5 text-sm text-subtle-foreground">No documents yet — upload some from a property's Documents tab.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold">{d.fileName}</TableCell>
                    <TableCell>
                      <Link href={`/properties/${d.property.id}`} className="text-accent hover:underline">
                        {d.property.nickname}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{d.docType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {d.expiryDate ? d.expiryDate.toLocaleDateString("en-CA") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
