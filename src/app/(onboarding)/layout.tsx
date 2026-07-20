import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/shells/app-shell";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <AppShell userName={session.user.name}>{children}</AppShell>;
}
