import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PropertyThumb } from "@/components/property-thumb";
import type { PropertyStatusView } from "@/lib/property-status";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

function fmtMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

const STATUS_COPY = {
  ok: "Looking good",
  warning: "Keep an eye on this",
  risk: "Needs you now",
} as const;

export function PropertyCard({
  id,
  nickname,
  address,
  view,
  thumbSrc,
  thumbKind,
}: {
  id: string;
  nickname: string;
  address: string;
  view: PropertyStatusView;
  thumbSrc: string | null;
  thumbKind: "photo" | "map" | null;
}) {
  const nightsLabel =
    view.cap != null && view.nightsUsed != null
      ? `${view.nightsUsed} / ${view.cap} nights`
      : null;

  return (
    <Link
      href={`/properties/${id}`}
      className={cn(
        "group glass flex flex-col overflow-hidden rounded-3xl transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      )}
    >
      <PropertyThumb
        src={thumbSrc}
        kind={thumbKind}
        alt={nickname}
        className="aspect-[16/10] w-full"
      />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold tracking-tight text-foreground group-hover:text-brand">
              {nickname}
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{address}</p>
          </div>
          <Badge variant={view.status}>{STATUS_COPY[view.status]}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Nights</p>
            <p className="text-sm font-extrabold tabular-nums">{nightsLabel ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">Renewal</p>
            <p className="text-sm font-extrabold tabular-nums">
              {view.daysToRenewal != null ? `${view.daysToRenewal}d` : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-muted-foreground">MAT due</p>
            <p className="text-sm font-extrabold tabular-nums">
              {view.matDueCents > 0 ? fmtMoney(view.matDueCents) : "$0"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-accent-strong">
          Open
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
