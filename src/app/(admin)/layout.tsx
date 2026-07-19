import { requireAdmin } from "@/lib/session";
import { AppShell } from "@/components/shells/app-shell";
import { AdminNavLinks } from "@/components/shells/admin-nav-links";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <AppShell
      userName={session.user.name}
      nav={<AdminNavLinks />}
      badge={
        <Badge
          variant="neutral"
          dot={false}
          className="ml-1 border border-white/15 bg-white/10 text-[10px] text-white"
        >
          Admin
        </Badge>
      }
    >
      {children}
    </AppShell>
  );
}
