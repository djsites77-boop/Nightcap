"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Users, Landmark } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/rules", label: "Jurisdictions", icon: Landmark },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors " +
              (isActive
                ? "bg-rail-surface text-rail-foreground-active"
                : "text-rail-foreground hover:bg-rail-surface hover:text-rail-foreground-active")
            }
          >
            <Icon className={"size-4 " + (isActive ? "text-accent-strong" : "opacity-80")} />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rail-foreground opacity-70 hover:opacity-100"
      >
        ← Back to app
      </Link>
    </nav>
  );
}
