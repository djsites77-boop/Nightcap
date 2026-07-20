import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property || property.userId !== session.user.id) notFound();

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
        All set
      </p>
      <h1 className="mb-2 text-xl font-extrabold tracking-tight text-foreground">
        {property.nickname} is set up.
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Add another property now, or head to your dashboard — you can always add more later.
      </p>
      <div className="flex gap-2.5">
        <Button variant="ghost" asChild>
          <Link href="/properties/new">+ Add another property</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/dashboard">Go to dashboard →</Link>
        </Button>
      </div>
    </div>
  );
}
