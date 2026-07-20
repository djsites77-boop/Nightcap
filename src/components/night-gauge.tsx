"use client";

import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@/lib/compliance/status";

const STATUS_COLOR: Record<ComplianceStatus, string> = {
  ok: "var(--status-ok)",
  warning: "var(--status-warning)",
  risk: "var(--status-risk)",
};

/** Big semicircle night-cap gauge — the visual hero of a property. */
export function NightGauge({
  nightsUsed,
  cap,
  status,
  size = "lg",
}: {
  nightsUsed: number;
  cap: number;
  status: ComplianceStatus;
  size?: "sm" | "lg";
}) {
  const radius = size === "lg" ? 96 : 64;
  const viewH = size === "lg" ? 128 : 88;
  const viewW = size === "lg" ? 220 : 150;
  const cx = viewW / 2;
  const cy = radius + 10;
  const circumference = Math.PI * radius;
  const pct = Math.max(0, Math.min(1, cap > 0 ? nightsUsed / cap : 0));
  const dash = circumference * pct;
  const stroke = size === "lg" ? 16 : 12;
  const color = STATUS_COLOR[status];
  const left = Math.max(0, cap - nightsUsed);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: viewW }}>
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          width={viewW}
          role="img"
          aria-label={`${nightsUsed} of ${cap} nights used — ${left} left`}
        >
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="var(--surface-sunken)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash.toFixed(1)} ${circumference.toFixed(1)}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        <div
          className="absolute inset-x-0 text-center"
          style={{ top: size === "lg" ? "48%" : "42%" }}
        >
          <div
            className={cn(
              "font-extrabold tabular-nums tracking-tight text-foreground",
              size === "lg" ? "text-4xl" : "text-2xl"
            )}
          >
            {nightsUsed}
          </div>
          <div className="text-xs font-semibold text-muted-foreground">of {cap} nights</div>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">
        <span className="tabular-nums">{left}</span> nights left this year
      </p>
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
