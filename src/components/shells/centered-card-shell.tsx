import { LogoMark, Wordmark } from "@/components/shells/logo-mark";

export function CenteredCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-top safe-bottom relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-5 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-app-sky"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-20 size-72 rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-10 size-80 rounded-full bg-brand/15 blur-3xl"
      />

      <div className="relative w-full max-w-[420px] animate-rise rounded-3xl glass p-6 sm:p-9">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={32} />
          <Wordmark />
        </div>
        {children}
      </div>
    </div>
  );
}
