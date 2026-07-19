import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Executive-dashboard KPI tile — large figure, soft label, optional hint. */
export function KpiStat({
  label,
  value,
  hint,
  tone = "default",
  className,
  stagger,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "ok" | "warning" | "risk" | "accent";
  className?: string;
  stagger?: 1 | 2 | 3 | 4;
}) {
  const valueTone = {
    default: "text-foreground",
    ok: "text-status-ok",
    warning: "text-status-warning",
    risk: "text-status-risk",
    accent: "text-accent-strong",
  }[tone];

  return (
    <Card
      className={cn(
        "animate-page-in transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover",
        stagger === 1 && "stagger-1",
        stagger === 2 && "stagger-2",
        stagger === 3 && "stagger-3",
        stagger === 4 && "stagger-4",
        className
      )}
    >
      <CardHeader className="pb-0">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={cn("font-mono text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight sm:text-3xl", valueTone)}>
          {value}
        </div>
        {hint != null && <div className="mt-1.5 text-xs leading-snug text-subtle-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
