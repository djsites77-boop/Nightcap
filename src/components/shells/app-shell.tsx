"use client";

import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/shells/nav-links";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  userName,
  nav,
  badge,
}: {
  children: React.ReactNode;
  userName: string;
  nav?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const titleId = useId();

  // Close drawer on route change-ish: when pathname would change, parent remounts
  // aren't guaranteed — listen to popstate + link clicks via Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const rail = (
    <>
      <div className="flex items-center gap-2.5 px-1.5">
        <LogoMark size={22} />
        <Wordmark light />
        {badge}
      </div>
      <div className="mt-6 flex-1" onClick={() => setMobileOpen(false)}>
        {nav ?? <NavLinks />}
      </div>
      <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
        <div className="px-1.5 text-xs leading-relaxed text-rail-foreground">
          Signed in as
          <br />
          <span className="font-semibold text-rail-foreground-active">{userName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <SignOutButton className="flex-1 justify-start border-white/10 px-2.5 hover:border-white/25" />
          <ThemeToggle className="border-white/10 text-rail-foreground hover:border-white/25 hover:text-rail-foreground-active" />
        </div>
      </div>
    </>
  );

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col bg-rail-background px-3.5 py-5 md:flex">{rail}</aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={cn(
            "absolute inset-0 bg-foreground/45 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(288px,88vw)] flex-col bg-rail-background px-3.5 py-5 shadow-xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span id={titleId} className="sr-only">
              Navigation
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close menu"
              className="ml-auto border-white/15 text-rail-foreground hover:text-rail-foreground-active"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
          </div>
          {rail}
        </aside>
      </div>

      <div className="flex min-w-0 flex-col bg-app-atmosphere">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-surface/85 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <LogoMark size={20} />
            <Wordmark />
            {badge}
          </div>
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 sm:px-8 sm:py-7 animate-page-in">
          {children}
        </main>
      </div>
    </div>
  );
}
