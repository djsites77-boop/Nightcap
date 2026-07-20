import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function KpiStat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "ok" | "warning" | "risk" | "accent";
  className?: string;
}) {
  const valueTone = {
    default: "text-foreground",
    ok: "text-status-ok",
    warning: "text-status-warning",
    risk: "text-status-risk",
    accent: "text-accent-strong",
  }[tone];

  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
        <div className={cn("text-3xl font-extrabold tabular-nums tracking-tight", valueTone)}>
          {value}
        </div>
        {hint != null && <p className="text-xs font-semibold text-subtle-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
