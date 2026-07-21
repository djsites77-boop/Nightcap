import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { setRegistration } from "@/app/actions/properties";
import { RegistrationForm } from "./registration-form";
import { StepMeta, WizardNav, WizardPanel, WizardSteps } from "@/components/shells/wizard-panel";
import { possessiveName } from "@/lib/accommodation-tax";

export default async function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({
    where: { id },
    include: { municipality: true },
  });
  if (!property || property.userId !== session.user.id) notFound();

  const action = setRegistration.bind(null, id);
  const cityPossessive = possessiveName(property.municipality.name);

  return (
    <WizardPanel>
      <WizardNav
        backHref={`/properties/${id}/connect-calendar`}
        cancelHref="/dashboard"
      />
      <WizardSteps current={3} total={3} />
      <StepMeta>Step 3 of 3 · Registration · {property.nickname}</StepMeta>
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-foreground">
        Registration for {property.nickname}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Enter the number and dates from your {cityPossessive} registration. We&apos;ll remind you
        before it expires — we can&apos;t look it up with the city for you.
      </p>
      <RegistrationForm action={action} propertyId={id} />
    </WizardPanel>
  );
}
