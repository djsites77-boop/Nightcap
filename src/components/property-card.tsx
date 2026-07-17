import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PropertyStatusView } from "@/lib/property-status";

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
    view.status === "risk" ? "bg-status-risk" : view.status === "warning" ? "bg-status-warning" : "bg-status-ok";

  return (
    <Link
      href={`/properties/${id}`}
      className="block rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-semibold text-foreground">{nickname}</div>
          <div className="mt-0.5 text-xs text-subtle-foreground">{address}</div>
        </div>
        <Badge variant={view.status}>{view.status}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {view.cap !== null ? (
          <div className="text-xs text-muted-foreground">
            Nights used
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {view.nightsUsed} / {view.cap}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Rooms offered
            <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {view.bedroomCap ?? "—"}
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Renewal
          <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {view.daysToRenewal !== null ? `${view.daysToRenewal}d` : "—"}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          MAT due
          <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {view.matDueCents > 0 ? fmtMoney(view.matDueCents) : "—"}
          </div>
        </div>
      </div>

      {pct !== null && (
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct * 100}%` }} />
        </div>
      )}
    </Link>
  );
}
