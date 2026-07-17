import { requireAdmin } from "@/lib/session";
import { AppShell } from "@/components/shells/app-shell";
import { AdminNavLinks } from "@/components/shells/admin-nav-links";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <AppShell userName={session.user.name} nav={<AdminNavLinks />} badge={<Badge variant="neutral" className="ml-1">Admin</Badge>}>
      {children}
    </AppShell>
  );
}
