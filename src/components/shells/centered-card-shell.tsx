import { LogoMark, Wordmark } from "@/components/shells/logo-mark";

export function CenteredCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
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

      <div className="relative w-full max-w-[420px] animate-rise rounded-3xl glass p-8 sm:p-9">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={32} />
          <Wordmark />
        </div>
        {children}
      </div>
    </div>
  );
}

export function StepMeta({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-sm font-semibold text-muted-foreground">{children}</p>;
}

export function WizardSteps({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="mb-6 flex items-center gap-1.5"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-colors duration-200"
          style={{ background: i < current ? "var(--accent)" : "var(--surface-sunken)" }}
        />
      ))}
    </div>
  );
}
