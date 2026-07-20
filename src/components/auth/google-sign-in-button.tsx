"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({
  label = "Continue with Google",
  callbackURL = "/dashboard",
}: {
  label?: string;
  callbackURL?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            await authClient.signIn.social({ provider: "google", callbackURL });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Google sign-in failed");
            setPending(false);
          }
        }}
      >
        <GoogleGlyph />
        {pending ? "Redirecting…" : label}
      </Button>
      {error && <p className="text-center text-xs font-semibold text-status-risk">{error}</p>}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.5 1.9C5 19.5 8.2 21.4 12 21.4c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.8.6-1.9.9-2.8.9-2.2 0-4-1.5-4.7-3.5z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.5 6 12.8 6 12s.2-1.5.6-2.3L3.2 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 2.9 14.4 2 12 2 8.2 2 5 3.9 3.2 7.1l3.4 2.6C7.9 7.3 9.8 5.8 12 5.8z"
      />
    </svg>
  );
}
