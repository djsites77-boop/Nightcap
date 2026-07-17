"use client";

import { useTransition } from "react";
import { toggleMunicipalityActive } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function MunicipalityActiveToggle({ municipalityId, active }: { municipalityId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => toggleMunicipalityActive(municipalityId, !active))}
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}
