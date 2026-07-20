"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Building2, FileText, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/documents", label: "Documents", shortLabel: "Docs", icon: FileText },
  { href: "/settings", label: "Account", shortLabel: "Account", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(href + "/");
}

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-glass px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around gap-0.5">
        {TABS.slice(0, 2).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition-colors sm:text-[11px]",
                active ? "bg-brand-soft text-brand" : "text-subtle-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-accent-strong")} strokeWidth={active ? 2.25 : 1.75} />
              {item.shortLabel ?? item.label}
            </Link>
          );
        })}

        <Link
          href="/properties/new"
          className="-mt-5 flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lift transition-transform active:scale-95"
          aria-label="Add property"
        >
          <Plus className="size-7" strokeWidth={2.5} />
        </Link>

        {TABS.slice(2).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold transition-colors sm:text-[11px]",
                active ? "bg-brand-soft text-brand" : "text-subtle-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "text-accent-strong")} strokeWidth={active ? 2.25 : 1.75} />
              {item.shortLabel ?? item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {TABS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:bg-brand-soft hover:text-brand"
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <Button asChild size="sm" className="ml-2">
        <Link href="/properties/new">Add property</Link>
      </Button>
    </nav>
  );
}
