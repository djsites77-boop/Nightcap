import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { WizardNav, WizardPanel } from "@/components/shells/wizard-panel";

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property || property.userId !== session.user.id) notFound();

  return (
    <WizardPanel>
      <WizardNav cancelHref="/dashboard" cancelLabel="Close" />
      <p className="mb-1.5 text-sm font-semibold text-muted-foreground">All set</p>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
        {property.nickname} is set up.
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Listing more than one place? Add the next one now and paste that listing&apos;s own calendar
        URL. Or go to the dashboard — you can add more anytime.
      </p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button variant="ghost" asChild className="sm:flex-1">
          <Link href="/properties/new">Add another listing</Link>
        </Button>
        <Button asChild className="sm:flex-1">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href={`/properties/${id}`} className="font-bold text-accent-strong hover:underline">
          Open this listing
        </Link>
      </p>
    </WizardPanel>
  );
}
