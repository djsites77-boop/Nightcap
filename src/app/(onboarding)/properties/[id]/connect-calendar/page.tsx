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
    include: {
      calendarConnections: true,
      municipality: true,
      rentalUnits: {
        orderBy: { createdAt: "asc" },
        include: { calendarConnections: true },
      },
    },
  });
  if (!property || property.userId !== session.user.id) notFound();

  const action = connectCalendar.bind(null, id);
  const taxLabel = accommodationTaxShortLabel(property.municipality.province);
  const isPartial = property.unitType === "partial_unit";

  return (
    <WizardPanel>
      <WizardNav backHref="/dashboard" backLabel="Home" cancelHref="/dashboard" />
      <WizardSteps current={2} total={3} />
      <StepMeta>Step 2 of 3 · Connect calendar · {property.nickname}</StepMeta>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
        {isPartial
          ? `Link calendars for rooms at ${property.nickname}`
          : `Link the calendar for ${property.nickname}`}
      </h1>
      <p className="mb-2 text-sm text-muted-foreground">
        {isPartial ? (
          <>
            Paste the iCal export URL for <span className="font-semibold text-foreground">each</span>{" "}
            Airbnb or VRBO room listing under this home. Dates only (no prices), so it won&apos;t fill
            your {taxLabel} ledger yet.
          </>
        ) : (
          <>
            Paste the iCal export URL for <span className="font-semibold text-foreground">this</span>{" "}
            Airbnb or VRBO listing — the one that matches {property.nickname}. Dates only (no prices),
            so it won&apos;t fill your {taxLabel} ledger yet.
          </>
        )}
      </p>
      <p className="mb-6 text-sm text-muted-foreground">
        {isPartial
          ? "You can skip a room and add its calendar later from the property page."
          : "Have several places? Finish this one, then add the next property with its own calendar URL."}
      </p>
      <ConnectCalendarForm
        action={action}
        existing={property.calendarConnections}
        propertyId={id}
        isPartial={isPartial}
        units={property.rentalUnits.map((u) => ({
          id: u.id,
          name: u.name,
          roomsOffered: u.roomsOffered,
          connections: u.calendarConnections,
        }))}
      />
    </WizardPanel>
  );
}
