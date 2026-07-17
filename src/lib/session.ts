import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Data Access Layer guard (Next.js's recommended pattern) — call at the top
 * of any Server Component or Server Action that needs an authenticated user. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Same, but only for platform admins — everyone else is bounced to their
 * own dashboard rather than shown a 404 (simpler than hiding the route). */
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}
