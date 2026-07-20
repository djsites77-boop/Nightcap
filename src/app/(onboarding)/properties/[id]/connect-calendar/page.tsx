import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { connectCalendar } from "@/app/actions/properties";
import { ConnectCalendarForm } from "./connect-calendar-form";
import { StepMeta, WizardNav, WizardPanel, WizardSteps } from "@/components/shells/wizard-panel";
import { accommodationTaxShortLabel } from "@/lib/accommodation-tax";

export default async function ConnectCalendarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({
    where: { id },
    include: { calendarConnections: true, municipality: true },
  });
  if (!property || property.userId !== session.user.id) notFound();

  const action = connectCalendar.bind(null, id);
  const taxLabel = accommodationTaxShortLabel(property.municipality.province);

  return (
    <WizardPanel>
      <WizardNav backHref="/dashboard" backLabel="Home" cancelHref="/dashboard" />
      <WizardSteps current={2} total={3} />
      <StepMeta>Step 2 of 3 · Connect calendar</StepMeta>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
        Import your booking calendar
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Paste the iCal export URL from Airbnb or VRBO. This gives us dates for the night-cap counter —
        not price, so it won&apos;t affect your {taxLabel} ledger yet.
      </p>
      <ConnectCalendarForm action={action} existing={property.calendarConnections} propertyId={id} />
    </WizardPanel>
  );
}
