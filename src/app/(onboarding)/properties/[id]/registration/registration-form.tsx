"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function RegistrationForm({
  action,
  propertyId,
}: {
  action: (formData: FormData) => Promise<void>;
  propertyId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await action(formData);
          } catch (e) {
            if (e instanceof Error && e.message !== "NEXT_REDIRECT") setError(e.message);
          }
        });
      }}
    >
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="registrationNumber">Registration number</Label>
        <Input id="registrationNumber" name="registrationNumber" required placeholder="Your registration / licence number" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registrationIssueDate">Issue date</Label>
          <Input id="registrationIssueDate" name="registrationIssueDate" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="registrationExpiryDate">Expiry date</Label>
          <Input id="registrationExpiryDate" name="registrationExpiryDate" type="date" required />
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button type="button" variant="ghost" className="sm:flex-1" asChild>
          <Link href="/dashboard">Cancel</Link>
        </Button>
        <Button type="submit" className="sm:flex-1" disabled={pending}>
          {pending ? "Saving…" : "Finish →"}
        </Button>
      </div>
    </form>
  );
}
