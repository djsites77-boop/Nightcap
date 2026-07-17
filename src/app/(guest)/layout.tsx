import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CenteredCardShell } from "@/components/shells/centered-card-shell";

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <CenteredCardShell>{children}</CenteredCardShell>;
}
