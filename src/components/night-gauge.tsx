import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@/lib/compliance/status";

const STATUS_VAR: Record<ComplianceStatus, string> = {
  ok: "var(--status-ok)",
  warning: "var(--status-warning)",
  risk: "var(--status-risk)",
};

export function NightGauge({
  nightsUsed,
  cap,
  status,
}: {
  nightsUsed: number;
  cap: number;
  status: ComplianceStatus;
}) {
  const radius = 84;
  const circumference = Math.PI * radius;
  const pct = Math.max(0, Math.min(1, cap > 0 ? nightsUsed / cap : 0));
  const dash = circumference * pct;
  const color = STATUS_VAR[status];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[220px]">
        <svg viewBox="0 0 200 110" width="220" role="img" aria-label={`${nightsUsed} of ${cap} nights used`}>
          <path
            d="M 16 96 A 84 84 0 0 1 184 96"
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 16 96 A 84 84 0 0 1 184 96"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
          />
        </svg>
        <div className="absolute inset-x-0 top-[58%] -translate-y-1/2 text-center">
          <div className="font-mono text-3xl font-semibold tabular-nums text-foreground">{nightsUsed}</div>
          <div className="mt-0.5 text-xs text-subtle-foreground">of {cap} nights</div>
        </div>
      </div>
    </div>
  );
}

export function statusToneClasses(status: ComplianceStatus) {
  return cn({
    "text-status-ok": status === "ok",
    "text-status-warning": status === "warning",
    "text-status-risk": status === "risk",
  });
}
