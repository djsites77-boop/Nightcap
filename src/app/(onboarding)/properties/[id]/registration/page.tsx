import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { setRegistration } from "@/app/actions/properties";
import { RegistrationForm } from "./registration-form";
import { StepMeta, WizardSteps } from "@/components/shells/centered-card-shell";

export default async function RegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property || property.userId !== session.user.id) notFound();

  const action = setRegistration.bind(null, id);

  return (
    <div>
      <WizardSteps current={3} total={3} />
      <StepMeta>Step 3 of 3 · Registration</StepMeta>
      <h1 className="mb-2 font-display text-xl font-semibold text-foreground">
        Add your registration details
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Self-reported — Toronto&apos;s registration-verification API isn&apos;t open to third-party tools, so
        Nightcap tracks your countdown but can&apos;t confirm status with the City.
      </p>
      <RegistrationForm action={action} propertyId={id} />
    </div>
  );
}
