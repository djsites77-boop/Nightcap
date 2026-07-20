import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepMeta({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-sm font-semibold text-muted-foreground">{children}</p>;
}

export function WizardSteps({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="mb-5 flex items-center gap-1.5"
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

/** Shared chrome for add-property wizard pages — same app header via layout. */
export function WizardPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-lg animate-rise", className)}>
      <div className="glass rounded-3xl p-5 sm:p-8">{children}</div>
    </div>
  );
}

export function WizardNav({
  backHref,
  backLabel = "Back",
  cancelHref = "/dashboard",
  cancelLabel = "Cancel",
}: {
  backHref?: string;
  backLabel?: string;
  cancelHref?: string;
  cancelLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      ) : (
        <span />
      )}
      <Link
        href={cancelHref}
        className="text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
      >
        {cancelLabel}
      </Link>
    </div>
  );
}
