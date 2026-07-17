"use client";

import { useTransition } from "react";
import { createMunicipality } from "@/app/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function NewMunicipalityForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => createMunicipality(formData))}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Vancouver" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="province">Province</Label>
        <Input id="province" name="province" required placeholder="BC" />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="active" className="accent-accent" />
        Enable immediately
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add municipality"}
      </Button>
    </form>
  );
}
