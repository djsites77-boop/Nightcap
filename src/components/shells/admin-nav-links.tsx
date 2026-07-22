"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Users, Landmark, Layers, Percent, KeyRound, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tiers", label: "Tiers & pricing", icon: Layers },
  { href: "/admin/tax-rates", label: "Tax rates", icon: Percent },
  { href: "/admin/rules", label: "Jurisdictions", icon: Landmark },
  { href: "/admin/keys", label: "Keys & APIs", icon: KeyRound },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition-colors duration-150",
              isActive
                ? "bg-rail-surface text-rail-foreground-active"
                : "text-rail-foreground hover:bg-rail-surface/70 hover:text-rail-foreground-active"
            )}
          >
            <span
              className={cn(
                "h-5 w-0.5 rounded-full transition-colors duration-150",
                isActive ? "bg-accent" : "bg-transparent group-hover:bg-rail-foreground/40"
              )}
              aria-hidden
            />
            <Icon
              className={cn("size-4", isActive ? "text-accent" : "opacity-80")}
              strokeWidth={1.75}
            />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="mt-3 flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rail-foreground/70 transition-colors hover:bg-rail-surface/50 hover:text-rail-foreground-active"
      >
        <ArrowLeft className="size-3.5 opacity-80" strokeWidth={1.75} />
        Back to app
      </Link>
    </nav>
  );
}
