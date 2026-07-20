"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
    } as Parameters<typeof authClient.signUp.email>[0]);
    setPending(false);
    if (error) {
      setError(error.message ?? "Couldn't create your account.");
      return;
    }
    router.push("/properties/new");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">Get started</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
          Your nights, covered
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Built for hosts — night caps, tax ledgers, and renewals in one calm place.
        </p>
      </div>

      <GoogleSignInButton label="Sign up with Google" callbackURL="/properties/new" />

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone <span className="font-normal text-subtle-foreground">(optional)</span></Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p
            className="rounded-2xl bg-status-risk-soft px-3 py-2 text-sm font-semibold text-status-risk"
            role="alert"
          >
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-accent-strong hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
