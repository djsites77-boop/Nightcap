"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Couldn't create your account.");
      return;
    }
    router.push("/properties/new");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
        Create your account
      </p>
      <h1 className="mb-1.5 text-balance font-display text-2xl font-semibold text-foreground">
        Track every night, tax dollar, and renewal.
      </h1>
      <p className="mb-6 max-w-[38ch] text-sm text-muted-foreground">
        Built for Toronto short-term rental hosts. No spreadsheets, no missed 180-night cap.
      </p>

      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="mb-2 flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

      <Button type="submit" className="mt-4 w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account →"}
      </Button>
      <p className="mt-4 text-center text-sm text-subtle-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Log in
        </Link>
      </p>
    </form>
  );
}
