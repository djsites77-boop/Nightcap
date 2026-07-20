"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type MonthPoint = { label: string; nights: number };

export type PropertyNightSeries = {
  id: string;
  nickname: string;
  /** Nights per month, same order/length as `monthLabels`. */
  months: number[];
};

const SERIES_COLORS = [
  "var(--accent-strong)",
  "var(--status-ok)",
  "var(--status-warning)",
  "var(--status-risk)",
  "#7dd3fc",
  "#c4b5fd",
  "#fda4af",
  "#86efac",
];

type ChartRow = { label: string; total: number } & Record<string, string | number>;

function buildChartRows(
  monthLabels: string[],
  series: PropertyNightSeries[],
  selectedIds: Set<string>
): ChartRow[] {
  return monthLabels.map((label, i) => {
    const row: ChartRow = { label, total: 0 };
    let total = 0;
    for (const s of series) {
      if (!selectedIds.has(s.id)) continue;
      const n = s.months[i] ?? 0;
      row[s.id] = n;
      total += n;
    }
    row.total = total;
    return row;
  });
}

function MonthBreakdownTooltip({
  active,
  label,
  row,
  series,
  selectedIds,
  colorById,
}: {
  active?: boolean;
  label?: string;
  row?: ChartRow;
  series: PropertyNightSeries[];
  selectedIds: Set<string>;
  colorById: Map<string, string>;
}) {
  if (!active || !label || !row) return null;

  const lines = series
    .filter((s) => selectedIds.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.nickname,
      value: Number(row[s.id] ?? 0),
      color: colorById.get(s.id) ?? "var(--accent)",
    }))
    .filter((l) => l.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = Number(row.total ?? 0);

  return (
    <div className="min-w-[190px] rounded-2xl border border-border bg-surface px-3.5 py-3 shadow-lift">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
        {total} <span className="text-sm font-bold text-muted-foreground">nights</span>
      </p>
      {lines.length > 0 && (
        <ul className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto border-t border-border pt-2.5">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: l.color }}
                />
                <span className="truncate">{l.name}</span>
              </span>
              <span className="shrink-0 font-extrabold tabular-nums">{l.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Portfolio nights trend — aggregate by default, filterable + drillable by property. */
export function PortfolioNightsChart({
  monthLabels,
  series,
}: {
  monthLabels: string[];
  series: PropertyNightSeries[];
}) {
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(series.map((s) => s.id))
  );
  const [mode, setMode] = React.useState<"aggregate" | "compare">("aggregate");

  const colorById = React.useMemo(() => {
    const map = new Map<string, string>();
    series.forEach((s, i) => map.set(s.id, SERIES_COLORS[i % SERIES_COLORS.length]!));
    return map;
  }, [series]);

  const data = React.useMemo(
    () => buildChartRows(monthLabels, series, selected),
    [monthLabels, series, selected]
  );

  const selectedSeries = React.useMemo(
    () => series.filter((s) => selected.has(s.id)),
    [series, selected]
  );

  const allSelected = selected.size === series.length && series.length > 0;
  const noneSelected = selected.size === 0;
  const compareOk = selected.size >= 1 && selected.size <= 6;
  const effectiveMode = mode === "compare" && compareOk ? "compare" : "aggregate";

  function toggleProperty(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (series.length === 0 || monthLabels.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sync a calendar to see your night trend.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelected(new Set(series.map((s) => s.id)))}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
              allSelected
                ? "bg-brand text-brand-foreground"
                : "bg-surface-alt text-muted-foreground hover:text-foreground"
            )}
          >
            All
            <span className="ml-1.5 tabular-nums opacity-70">{series.length}</span>
          </button>
          {series.map((s) => {
            const on = selected.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleProperty(s.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-colors",
                  on
                    ? "bg-brand-soft text-brand"
                    : "bg-surface-alt text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                  style={{ background: colorById.get(s.id) }}
                />
                {s.nickname}
              </button>
            );
          })}
        </div>

        {series.length > 1 && (
          <div className="flex shrink-0 gap-1 self-start rounded-full bg-surface-alt p-1">
            <button
              type="button"
              onClick={() => setMode("aggregate")}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                effectiveMode === "aggregate"
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Total
            </button>
            <button
              type="button"
              onClick={() => setMode("compare")}
              disabled={selected.size === 0 || selected.size > 6}
              title={
                selected.size > 6
                  ? "Select up to 6 listings to compare"
                  : selected.size === 0
                    ? "Select at least one listing"
                    : "Show each listing as its own line"
              }
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                effectiveMode === "compare"
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Compare
            </button>
          </div>
        )}
      </div>

      {noneSelected ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Select at least one listing to chart.
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold leading-snug text-muted-foreground">
            {effectiveMode === "aggregate"
              ? "Portfolio total for the selected listings — hover a month to drill into each property."
              : `Comparing ${Math.min(selectedSeries.length, 6)} listing${selectedSeries.length === 1 ? "" : "s"}.`}
          </p>
          <div className="h-52 w-full min-w-0 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="nightsFillTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
                  content={({ active, label, payload }) => {
                    const pointLabel = typeof label === "string" ? label : undefined;
                    const row =
                      (payload?.[0]?.payload as ChartRow | undefined) ??
                      data.find((d) => d.label === pointLabel);
                    return (
                      <MonthBreakdownTooltip
                        active={active}
                        label={pointLabel}
                        row={row}
                        series={series}
                        selectedIds={selected}
                        colorById={colorById}
                      />
                    );
                  }}
                />
                {effectiveMode === "compare" && selectedSeries.length > 1 && (
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    formatter={(value) =>
                      series.find((s) => s.id === value)?.nickname ?? String(value)
                    }
                    wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                  />
                )}

                {effectiveMode === "aggregate" ? (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="var(--accent-strong)"
                    strokeWidth={2.5}
                    fill="url(#nightsFillTotal)"
                    animationDuration={600}
                  />
                ) : (
                  selectedSeries.slice(0, 6).map((s) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.id}
                      name={s.id}
                      stroke={colorById.get(s.id)}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      animationDuration={500}
                    />
                  ))
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

/** Simple single-series chart (wraps portfolio chart). */
export function OccupancyAreaChart({ data }: { data: MonthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sync a calendar to see your night trend.
      </div>
    );
  }

  return (
    <PortfolioNightsChart
      monthLabels={data.map((d) => d.label)}
      series={[{ id: "all", nickname: "All", months: data.map((d) => d.nights) }]}
    />
  );
}
