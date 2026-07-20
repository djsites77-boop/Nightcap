import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export type PortfolioRowData = {
  id: string;
  nickname: string;
  address: string;
  municipalityLabel: string;
  taxDueLabel: string;
  status: ComplianceStatus;
  nightsUsed: number | null;
  cap: number | null;
  daysToRenewal: number | null;
  matDueCents: number;
};

function Metric({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="text-[11px] font-semibold leading-none text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-extrabold leading-none tabular-nums text-foreground", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function NightCapBar({
  nightsUsed,
  cap,
  status,
}: {
  nightsUsed: number;
  cap: number;
  status: ComplianceStatus;
}) {
  const pct = Math.max(0, Math.min(100, cap > 0 ? (nightsUsed / cap) * 100 : 0));
  const left = Math.max(0, cap - nightsUsed);

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-extrabold leading-none tabular-nums text-foreground">
          {nightsUsed}
          <span className="font-semibold text-muted-foreground"> / {cap}</span>
        </p>
        <p className="text-[11px] font-semibold leading-none tabular-nums text-muted-foreground">
          {left} left
        </p>
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

/** Portfolio row — fixed columns so metrics never collide. */
export function PortfolioPropertyRow({
  row,
  compact = false,
}: {
  row: PortfolioRowData;
  compact?: boolean;
}) {
  const {
    id,
    nickname,
    municipalityLabel,
    taxDueLabel,
    status,
    nightsUsed,
    cap,
    daysToRenewal,
    matDueCents,
  } = row;

  return (
    <Link
      href={`/properties/${id}`}
      className={cn(
        "group grid grid-cols-1 gap-x-6 gap-y-3 border-b border-border transition-colors last:border-b-0",
        "hover:bg-surface-alt/60 focus-visible:bg-surface-alt/60 focus-visible:outline-none",
        "sm:grid-cols-[minmax(12rem,1.35fr)_minmax(9rem,1.15fr)_4.75rem_5.75rem_1.25rem] sm:items-center",
        compact ? "px-4 py-3.5 sm:px-5 sm:py-3.5" : "px-4 py-4 sm:px-5 sm:py-4"
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <h3 className="truncate text-base font-extrabold tracking-tight text-foreground group-hover:text-brand">
            {nickname}
          </h3>
          <Badge variant={status} className="shrink-0">
            {STATUS_COPY[status]}
          </Badge>
        </div>
        <p className="truncate text-xs font-medium leading-snug text-muted-foreground">
          {municipalityLabel}
        </p>
      </div>

      <div className="min-w-0">
        {cap != null && nightsUsed != null ? (
          <NightCapBar nightsUsed={nightsUsed} cap={cap} status={status} />
        ) : (
          <Metric label="Night cap" value="None" valueClassName="text-muted-foreground" />
        )}
      </div>

      <Metric
        label="Renewal"
        value={daysToRenewal != null ? `${daysToRenewal}d` : "—"}
        valueClassName={
          daysToRenewal != null && daysToRenewal < 30 ? "text-status-warning" : undefined
        }
      />

      <Metric
        label={taxDueLabel}
        value={matDueCents > 0 ? fmtMoney(matDueCents) : "$0"}
        className="sm:text-right"
      />

      <ChevronRight className="hidden size-4 justify-self-end text-subtle-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

export function statusSortRank(status: ComplianceStatus): number {
  if (status === "risk") return 0;
  if (status === "warning") return 1;
  return 2;
}
