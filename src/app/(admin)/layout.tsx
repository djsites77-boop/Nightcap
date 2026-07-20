import { requireAdmin } from "@/lib/session";
import { AdminShell } from "@/components/shells/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <AdminShell userName={session.user.name}>{children}</AdminShell>;
}
