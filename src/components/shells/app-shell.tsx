"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { BottomTabs, DesktopNav } from "@/components/shells/host-nav";

function isWizardRoute(pathname: string): boolean {
  if (pathname === "/properties/new") return true;
  return (
    /^\/properties\/[^/]+\/(connect-calendar|registration|done)\/?$/.test(pathname)
  );
}

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const wizard = isWizardRoute(pathname);

  return (
    <div className="min-h-dvh bg-app-sky">
      <header className="safe-top sticky top-0 z-40 border-b border-border bg-surface-glass backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-14 max-w-[1080px] min-w-0 items-center justify-between gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <LogoMark size={30} />
            <div className="leading-tight">
              <Wordmark />
              <p className="hidden text-[11px] font-medium text-muted-foreground sm:block">
                Hey {userName.split(" ")[0]}
              </p>
            </div>
          </Link>
          {!wizard && <DesktopNav />}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <SignOutButton className="md:!px-4 !px-2" />
          </div>
        </div>
      </header>

      <main
        className={
          wizard
            ? "mx-auto min-w-0 max-w-[1080px] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 sm:pb-10 sm:pt-8 animate-rise"
            : "mx-auto min-w-0 max-w-[1080px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 sm:pb-10 sm:pt-8 animate-rise"
        }
      >
        {children}
      </main>

      {!wizard && <BottomTabs />}
    </div>
  );
}
