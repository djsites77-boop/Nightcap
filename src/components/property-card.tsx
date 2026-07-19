import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatusView } from "@/lib/property-status";
import { cn } from "@/lib/utils";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export function PropertyCard({
  id,
  nickname,
  address,
  view,
}: {
  id: string;
  nickname: string;
  address: string;
  view: PropertyStatusView;
}) {
  const pct = view.cap && view.nightsUsed !== null ? Math.min(1, view.nightsUsed / view.cap) : null;
  const barColor =
    view.status === "risk"
      ? "bg-status-risk"
      : view.status === "warning"
        ? "bg-status-warning"
        : "bg-status-ok";
  const statusBorder =
    view.status === "risk"
      ? "border-l-status-risk"
      : view.status === "warning"
        ? "border-l-status-warning"
        : "border-l-status-ok";

  return (
    <Link
      href={`/properties/${id}`}
      className={cn(
        "group block rounded-xl border border-border border-l-[3px] bg-surface p-5 shadow-card",
        "transition-[box-shadow,transform,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        statusBorder
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-accent-strong">
            {nickname}
          </div>
          <div className="mt-0.5 truncate text-xs text-subtle-foreground">{address}</div>
        </div>
        <Badge variant={view.status}>{view.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {view.cap !== null ? (
          <div className="text-xs text-muted-foreground">
            Nights used
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
              {view.nightsUsed} / {view.cap}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Rooms offered
            <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
              {view.bedroomCap ?? "—"}
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Renewal
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
            {view.daysToRenewal !== null ? `${view.daysToRenewal}d` : "—"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          MAT due
          <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">
            {view.matDueCents > 0 ? fmtMoney(view.matDueCents) : "—"}
          </div>
        </div>
      </div>

      {pct !== null && (
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Night cap ${Math.round(pct * 100)}% used`}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-300 ease-out", barColor)}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}
    </Link>
  );
}
