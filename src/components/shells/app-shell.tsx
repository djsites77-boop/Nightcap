import { LogoMark, Wordmark } from "@/components/shells/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/shells/nav-links";

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
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_1fr]">
      <aside className="hidden flex-col gap-6 bg-rail-background px-3.5 py-5 md:flex">
        <div className="flex items-center gap-2 px-1.5">
          <LogoMark size={22} />
          <Wordmark light />
          {badge}
        </div>
        {nav ?? <NavLinks />}
        <div className="mt-auto flex items-center justify-between px-1.5">
          <div className="text-xs text-rail-foreground">
            Signed in as
            <br />
            <span className="text-rail-foreground-active">{userName}</span>
          </div>
        </div>
        <SignOutButton className="justify-start px-2.5" />
      </aside>

      <main className="mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-8 sm:py-7">
        <div className="mb-5 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <Wordmark />
          </div>
          <ThemeToggle />
        </div>
        <div className="mb-3 hidden justify-end md:flex">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
