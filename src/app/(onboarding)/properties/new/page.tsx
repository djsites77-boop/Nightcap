import { prisma } from "@/lib/db";
import { createProperty } from "@/app/actions/properties";
import { NewPropertyForm } from "./new-property-form";
import { StepMeta, WizardNav, WizardPanel, WizardSteps } from "@/components/shells/wizard-panel";

export default async function NewPropertyPage() {
  const municipalities = await prisma.municipality.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      complianceRules: {
        where: {
          ruleType: { in: ["partial_unit_bedroom_cap", "night_cap"] },
        },
        orderBy: { effectiveDate: "desc" },
      },
    },
  });

  const options = municipalities.map((m) => {
    const bedroomCapRule = m.complianceRules.find((r) => r.ruleType === "partial_unit_bedroom_cap");
    const nightCapRule = m.complianceRules.find((r) => r.ruleType === "night_cap");
    const bedroomCap =
      bedroomCapRule && typeof bedroomCapRule.value === "object" && bedroomCapRule.value !== null
        ? (bedroomCapRule.value as { maxBedroomsSimultaneous?: number; oneFewerThanTotal?: boolean })
        : null;
    const nightCap =
      nightCapRule && typeof nightCapRule.value === "object" && nightCapRule.value !== null
        ? (nightCapRule.value as { nights?: number })
        : null;

    return {
      id: m.id,
      name: m.name,
      province: m.province,
      active: m.active,
      nightCapNights: nightCap?.nights ?? null,
      partialUnitCap: bedroomCap
        ? {
            maxBedroomsSimultaneous: bedroomCap.maxBedroomsSimultaneous ?? null,
            oneFewerThanTotal: Boolean(bedroomCap.oneFewerThanTotal),
          }
        : null,
    };
  });

  return (
    <WizardPanel>
      <WizardNav cancelHref="/dashboard" cancelLabel="Cancel" />
      <WizardSteps current={1} total={3} />
      <StepMeta>Step 1 of 3 · Add property</StepMeta>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">
        Tell us about the listing
      </h1>
      <NewPropertyForm municipalities={options} action={createProperty} />
    </WizardPanel>
  );
}
