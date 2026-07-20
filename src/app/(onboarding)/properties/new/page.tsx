import { prisma } from "@/lib/db";
import { createProperty } from "@/app/actions/properties";
import { NewPropertyForm } from "./new-property-form";
import { StepMeta, WizardSteps } from "@/components/shells/centered-card-shell";

export default async function NewPropertyPage() {
  const municipalities = await prisma.municipality.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <WizardSteps current={1} total={3} />
      <StepMeta>Step 1 of 3 · Add property</StepMeta>
      <h1 className="mb-6 text-xl font-extrabold tracking-tight text-foreground">
        Tell us about the listing
      </h1>
      <NewPropertyForm municipalities={municipalities} action={createProperty} />
    </div>
  );
}
