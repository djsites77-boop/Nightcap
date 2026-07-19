"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Home, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/properties", label: "Properties", icon: Home },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
    </nav>
  );
}
