"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthPoint = { label: string; nights: number };

export function OccupancyAreaChart({ data }: { data: MonthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Sync a calendar to see your night trend.
      </div>
    );
  }

  return (
    <div className="h-48 w-full min-w-0 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="nightsFill" x1="0" y1="0" x2="0" y2="1">
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
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-soft)",
              fontWeight: 600,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(value) => [`${value} nights`, "Booked"]}
          />
          <Area
            type="monotone"
            dataKey="nights"
            stroke="var(--accent-strong)"
            strokeWidth={2.5}
            fill="url(#nightsFill)"
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
