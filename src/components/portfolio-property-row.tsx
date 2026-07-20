import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatusView } from "@/lib/property-status";
import type { ComplianceStatus } from "@/lib/compliance/status";
import { cn } from "@/lib/utils";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

const STATUS_COPY = {
  ok: "On track",
  warning: "Watch",
  risk: "Urgent",
} as const;

const BAR_COLOR: Record<ComplianceStatus, string> = {
  ok: "bg-status-ok",
  warning: "bg-status-warning",
  risk: "bg-status-risk",
};

export function NightCapBar({
  nightsUsed,
  cap,
  status,
  className,
}: {
  nightsUsed: number;
  cap: number;
  status: ComplianceStatus;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, cap > 0 ? (nightsUsed / cap) * 100 : 0));
  const left = Math.max(0, cap - nightsUsed);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-extrabold tabular-nums text-foreground">
          {nightsUsed}
          <span className="font-semibold text-muted-foreground"> / {cap}</span>
        </p>
        <p className="text-xs font-semibold tabular-nums text-muted-foreground">{left} left</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", BAR_COLOR[status])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Dense portfolio row — scan nights / renewal / tax across many listings. */
export function PortfolioPropertyRow({
  id,
  nickname,
  municipalityLabel,
  view,
  taxDueLabel = "Tax due",
}: {
  id: string;
  nickname: string;
  municipalityLabel: string;
  view: PropertyStatusView;
  taxDueLabel?: string;
}) {
  return (
    <Link
      href={`/properties/${id}`}
      className={cn(
        "group flex flex-col gap-3 border-b border-border px-4 py-4 transition-colors last:border-b-0",
        "hover:bg-surface-alt/60 focus-visible:bg-surface-alt/60 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-extrabold tracking-tight text-foreground group-hover:text-brand">
            {nickname}
          </h3>
          <Badge variant={view.status} className="shrink-0">
            {STATUS_COPY[view.status]}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{municipalityLabel}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[280px] sm:flex-1 sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:items-end">
        {view.cap != null && view.nightsUsed != null ? (
          <NightCapBar nightsUsed={view.nightsUsed} cap={view.cap} status={view.status} />
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">No night cap</p>
        )}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground">Renewal</p>
          <p
            className={cn(
              "text-sm font-extrabold tabular-nums",
              view.daysToRenewal != null && view.daysToRenewal < 30
                ? "text-status-warning"
                : "text-foreground"
            )}
          >
            {view.daysToRenewal != null ? `${view.daysToRenewal}d` : "—"}
          </p>
        </div>
        <div className="text-right sm:text-left">
          <p className="text-[11px] font-semibold text-muted-foreground">{taxDueLabel}</p>
          <p className="text-sm font-extrabold tabular-nums text-foreground">
            {view.matDueCents > 0 ? fmtMoney(view.matDueCents) : "$0"}
          </p>
        </div>
      </div>

      <ChevronRight className="hidden size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

export function statusSortRank(status: ComplianceStatus): number {
  if (status === "risk") return 0;
  if (status === "warning") return 1;
  return 2;
}
