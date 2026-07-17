"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Home, FileText, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/properties", label: "Properties", icon: Home },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
    </nav>
  );
}
