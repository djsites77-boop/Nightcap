import { LogoMark, Wordmark } from "@/components/shells/logo-mark";

export function CenteredCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      {/* Atmosphere — soft teal wash + paper grain feel without flat single color */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(900px 520px at 88% -8%, var(--accent-soft), transparent 58%),
            radial-gradient(700px 480px at 8% 110%, color-mix(in srgb, var(--surface-alt) 90%, transparent), transparent 55%),
            linear-gradient(165deg, var(--background) 0%, color-mix(in srgb, var(--accent-soft) 35%, var(--background)) 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative w-full max-w-[440px] animate-page-in rounded-2xl border border-border bg-surface/95 p-8 shadow-card-hover backdrop-blur-sm sm:p-9">
        <div className="mb-7 flex items-center gap-2.5">
          <LogoMark size={26} />
          <Wordmark />
        </div>
        {children}
      </div>
    </div>
  );
}

export function StepMeta({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
      {children}
    </p>
  );
}

export function WizardSteps({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-5 flex items-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-colors duration-200"
          style={{
            background: i < current ? "var(--accent)" : "var(--surface-sunken)",
          }}
        />
      ))}
    </div>
  );
}
