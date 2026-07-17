"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Couldn't sign you in — check your email and password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
        Welcome back
      </p>
      <h1 className="mb-6 font-display text-2xl font-semibold text-foreground">Log in to Nightcap</h1>

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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

      <Button type="submit" className="mt-4 w-full" disabled={pending}>
        {pending ? "Logging in…" : "Log in →"}
      </Button>
      <p className="mt-4 text-center text-sm text-subtle-foreground">
        New to Nightcap?{" "}
        <Link href="/sign-up" className="font-semibold text-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}
