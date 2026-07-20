"use client";

import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { BottomTabs, DesktopNav } from "@/components/shells/host-nav";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="min-h-dvh bg-app-sky">
      <header className="sticky top-0 z-40 border-b border-border bg-surface-glass backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <div className="leading-tight">
              <Wordmark />
              <p className="hidden text-[11px] font-medium text-muted-foreground sm:block">
                Hey {userName.split(" ")[0]}
              </p>
            </div>
          </div>
          <DesktopNav />
          <div className="flex items-center gap-1.5 md:hidden">
            <ThemeToggle />
            <SignOutButton className="!px-2" />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 pb-28 pt-5 sm:px-6 sm:pb-10 sm:pt-8 animate-rise">
        {children}
      </main>

      <BottomTabs />
    </div>
  );
}
