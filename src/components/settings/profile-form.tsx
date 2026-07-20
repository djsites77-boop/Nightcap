"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  firstName,
  lastName,
  email,
  phone,
  initials,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  initials: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(fd) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await updateProfile(fd);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save profile");
          }
        });
      }}
    >
      <div className="flex items-center gap-3 pb-2">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-lg font-extrabold text-brand">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-foreground">
            {[firstName, lastName].filter(Boolean).join(" ") || "Your profile"}
          </p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required defaultValue={firstName} autoComplete="given-name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required defaultValue={lastName} autoComplete="family-name" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue={email} autoComplete="email" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          autoComplete="tel"
          placeholder="(416) 555-0199"
        />
      </div>

      {error && (
        <p className="rounded-2xl bg-status-risk-soft px-3 py-2 text-sm font-semibold text-status-risk" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-2xl bg-status-ok-soft px-3 py-2 text-sm font-semibold text-status-ok">Saved</p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
