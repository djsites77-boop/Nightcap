import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { connectCalendar } from "@/app/actions/properties";
import { ConnectCalendarForm } from "./connect-calendar-form";
import { StepMeta, WizardSteps } from "@/components/shells/centered-card-shell";

export default async function ConnectCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({
    where: { id },
    include: { calendarConnections: true },
  });
  if (!property || property.userId !== session.user.id) notFound();

  const action = connectCalendar.bind(null, id);

  return (
    <div>
      <WizardSteps current={2} total={3} />
      <StepMeta>Step 2 of 3 · Connect calendar</StepMeta>
      <h1 className="mb-2 text-xl font-extrabold tracking-tight text-foreground">
        Import your booking calendar
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Paste the iCal export URL from Airbnb or VRBO. This gives us dates for the night-cap counter —
        not price, so it won&apos;t affect your MAT ledger yet.
      </p>
      <ConnectCalendarForm action={action} existing={property.calendarConnections} propertyId={id} />
    </div>
  );
}
