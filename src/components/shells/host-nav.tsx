"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/documents", label: "Docs", icon: FileText },
  { href: "/settings", label: "You", icon: Settings },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-glass px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around">
        {TABS.slice(0, 2).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[11px] font-semibold transition-colors",
                active ? "text-brand" : "text-subtle-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-accent-strong")} strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}

        <Link
          href="/properties/new"
          className="-mt-5 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lift transition-transform active:scale-95"
          aria-label="Add property"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </Link>

        {TABS.slice(2).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[11px] font-semibold transition-colors",
                active ? "text-brand" : "text-subtle-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-accent-strong")} strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  const items = [
    { href: "/dashboard", label: "Home" },
    { href: "/documents", label: "Documents" },
    { href: "/settings", label: "Account" },
  ];

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-brand text-white"
                : "text-muted-foreground hover:bg-brand-soft hover:text-brand"
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/properties/new"
        className="ml-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-soft transition-transform hover:bg-accent-strong active:scale-[0.98]"
      >
        Add property
      </Link>
    </nav>
  );
}
