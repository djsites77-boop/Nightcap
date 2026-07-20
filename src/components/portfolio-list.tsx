"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { PortfolioPropertyRow, type PortfolioRowData } from "@/components/portfolio-property-row";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ComplianceStatus } from "@/lib/compliance/status";

type FilterId = "attention" | "all" | "risk" | "warning" | "ok";

function matchesFilter(status: ComplianceStatus, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "attention") return status === "risk" || status === "warning";
  return status === filter;
}

export function PortfolioList({
  rows,
  attentionCount,
}: {
  rows: PortfolioRowData[];
  attentionCount: number;
}) {
  const large = rows.length >= 4;
  const showSearch = rows.length >= 6;

  const [filter, setFilter] = React.useState<FilterId>(() =>
    large && attentionCount > 0 ? "attention" : "all"
  );
  const [query, setQuery] = React.useState("");

  const counts = React.useMemo(() => {
    let risk = 0;
    let warning = 0;
    let ok = 0;
    for (const r of rows) {
      if (r.status === "risk") risk += 1;
      else if (r.status === "warning") warning += 1;
      else ok += 1;
    }
    return { risk, warning, ok, attention: risk + warning };
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesFilter(r.status, filter)) return false;
      if (!q) return true;
      return (
        r.nickname.toLowerCase().includes(q) ||
        r.municipalityLabel.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const chips: Array<{ id: FilterId; label: string; count: number; hide?: boolean }> = [
    {
      id: "attention",
      label: "Needs a look",
      count: counts.attention,
      hide: counts.attention === 0,
    },
    { id: "all", label: "All", count: rows.length },
    { id: "risk", label: "Urgent", count: counts.risk, hide: counts.risk === 0 },
    { id: "warning", label: "Watch", count: counts.warning, hide: counts.warning === 0 },
    { id: "ok", label: "On track", count: counts.ok, hide: counts.ok === 0 },
  ];

  return (
    <div>
      {(large || showSearch) && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
          <div className="flex max-w-full gap-2 overflow-x-auto scrollbar-none">
            {chips
              .filter((c) => !c.hide)
              .map((c) => {
                const active = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilter(c.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
                      active
                        ? "bg-brand text-brand-foreground"
                        : "bg-surface-alt text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.label}
                    <span className="ml-1.5 tabular-nums opacity-70">{c.count}</span>
                  </button>
                );
              })}
          </div>
          {showSearch && (
            <div className="relative w-full sm:max-w-[220px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-subtle-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings…"
                className="h-9 min-h-9 rounded-xl pl-9 text-sm"
                aria-label="Search listings"
              />
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="text-sm font-bold text-foreground">
            {query.trim()
              ? "No listings match that search"
              : filter === "attention"
                ? "Nothing needs you right now"
                : "No listings in this view"}
          </p>
          {filter !== "all" && (
            <button
              type="button"
              className="mt-2 text-sm font-bold text-accent-strong hover:underline"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Show all {rows.length} listings
            </button>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((row) => (
            <PortfolioPropertyRow key={row.id} row={row} compact={large} />
          ))}
        </div>
      )}

      {filter === "attention" && counts.ok > 0 && !query.trim() && (
        <div className="border-t border-border px-4 py-4 text-center sm:px-5">
          <button
            type="button"
            className="text-sm font-bold text-muted-foreground hover:text-foreground"
            onClick={() => setFilter("all")}
          >
            {counts.ok} on track — show all {rows.length}
          </button>
        </div>
      )}
    </div>
  );
}
