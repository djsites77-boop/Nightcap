import { LogoMark, Wordmark } from "@/components/shells/logo-mark";

export function CenteredCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-12"
      style={{
        background:
          "radial-gradient(700px 420px at 85% -10%, var(--accent-soft), transparent 60%), var(--background)",
      }}
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-9 shadow-lg">
        <div className="mb-7 flex items-center gap-2.5">
          <LogoMark size={24} />
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
    <div className="mb-5 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{
            background: i < current ? "var(--accent)" : "var(--surface-sunken)",
            opacity: i === current - 1 ? 1 : i < current - 1 ? 1 : 1,
          }}
        />
      ))}
    </div>
  );
}
