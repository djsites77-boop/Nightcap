import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">{title}</h1>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
