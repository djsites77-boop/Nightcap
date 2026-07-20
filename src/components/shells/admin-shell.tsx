"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Users, Landmark, Layers, Percent, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tiers", label: "Tiers", icon: Layers },
  { href: "/admin/tax-rates", label: "Tax rates", icon: Percent },
  { href: "/admin/rules", label: "Places", icon: Landmark },
];

export function AdminShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-app-sky">
      <header className="sticky top-0 z-40 border-b border-border bg-surface-glass backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <Wordmark />
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent-strong">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {NAV.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active ? "bg-brand text-white" : "text-muted-foreground hover:bg-brand-soft"
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Host app
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 animate-rise">{children}</main>
    </div>
  );
}
