import { requireSession } from "@/lib/session";
import { CenteredCardShell } from "@/components/shells/centered-card-shell";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <CenteredCardShell>{children}</CenteredCardShell>;
}
