"use client";

import { createAuthClient } from "better-auth/react";

/** Always talk to the host you're actually browsing — localhost or ngrok. */
function resolveClientBaseURL(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3500";
}

export const authClient = createAuthClient({
  baseURL: resolveClientBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
