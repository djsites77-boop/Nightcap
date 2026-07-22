"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { BookingRevenueForm } from "@/components/property-detail/host-actions";

export type BookingCalendarItem = {
  id: string;
  checkIn: string; // ISO
  checkOut: string;
  nights: number;
  platform: "airbnb" | "vrbo" | "direct";
  source: string;
  grossAmount: number | null;
  crossesBoundary?: boolean;
};

const PLATFORM_STYLE: Record<
  BookingCalendarItem["platform"],
  { bar: string; chip: string; label: string }
> = {
  airbnb: {
    bar: "bg-[#FF5A5F]",
    chip: "bg-[#FF5A5F]/20 text-[#FF5A5F] dark:text-[#ff8a8e]",
    label: "Airbnb",
  },
  vrbo: {
    bar: "bg-[#3B82F6]",
    chip: "bg-[#3B82F6]/20 text-[#3B82F6] dark:text-[#93c5fd]",
    label: "VRBO",
  },
  direct: {
    bar: "bg-accent",
    chip: "bg-accent-soft text-accent-strong",
    label: "Direct",
  },
};

function fmtDate(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Nights occupied: check-in inclusive → check-out exclusive. */
function bookingCoversDay(booking: BookingCalendarItem, day: Date): boolean {
  const start = startOfDay(parseISO(booking.checkIn));
  const end = startOfDay(parseISO(booking.checkOut));
  const d = startOfDay(day);
  return d >= start && d < end;
}

export function BookingsPanel({
  bookings,
  taxLabel,
}: {
  bookings: BookingCalendarItem[];
  taxLabel: string;
}) {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const selectedBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookings.filter((b) => bookingCoversDay(b, selectedDay));
  }, [bookings, selectedDay]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full bg-brand-soft/80 p-1">
          <button
            type="button"
            onClick={() => setMode("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              mode === "calendar"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="size-3.5" strokeWidth={1.75} />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              mode === "list"
                ? "bg-brand text-brand-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="size-3.5" strokeWidth={1.75} />
            List
          </button>
        </div>

        {mode === "calendar" && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Previous month"
              onClick={() => setCursor((c) => subMonths(c, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-[9.5rem] text-center text-sm font-extrabold tabular-nums text-foreground">
              {format(cursor, "MMMM yyyy")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Next month"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {bookings.length === 0 ? (
        <p className="text-sm text-subtle-foreground">No bookings yet.</p>
      ) : mode === "calendar" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {(Object.keys(PLATFORM_STYLE) as Array<keyof typeof PLATFORM_STYLE>).map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", PLATFORM_STYLE[p].bar)} />
                {PLATFORM_STYLE[p].label}
              </span>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-7 border-b border-border bg-surface-alt/60">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-subtle-foreground sm:text-xs"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const covering = bookings.filter((b) => bookingCoversDay(b, day));
                const selected = selectedDay ? isSameDay(day, selectedDay) : false;
                const platforms = [...new Set(covering.map((b) => b.platform))];

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative flex min-h-[4.25rem] flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors sm:min-h-[5.25rem] sm:p-2",
                      !inMonth && "bg-surface-alt/30 text-subtle-foreground",
                      inMonth && "hover:bg-brand-soft/50",
                      selected && "bg-accent-soft/60 ring-2 ring-inset ring-accent",
                      isToday(day) && !selected && "bg-brand-soft/40"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                        isToday(day) && "bg-accent text-accent-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {covering.length > 0 && (
                      <div className="mt-auto flex flex-col gap-0.5">
                        {platforms.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className={cn("h-1.5 w-full rounded-full", PLATFORM_STYLE[p].bar)}
                            title={PLATFORM_STYLE[p].label}
                          />
                        ))}
                        {covering.length > 1 && (
                          <span className="text-[9px] font-bold text-muted-foreground">
                            {covering.length} stays
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 sm:p-4">
            {selectedDay ? (
              <>
                <p className="text-sm font-extrabold text-foreground">
                  {format(selectedDay, "EEEE, MMM d, yyyy")}
                </p>
                {selectedBookings.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No stay on this night.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {selectedBookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              PLATFORM_STYLE[b.platform].chip
                            )}
                          >
                            {PLATFORM_STYLE[b.platform].label}
                          </span>
                          <p className="mt-1.5 text-sm font-semibold text-foreground">
                            {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              {b.nights} night{b.nights === 1 ? "" : "s"}
                            </span>
                          </p>
                          {b.crossesBoundary ? (
                            <p className="mt-1 text-[11px] font-semibold text-status-warning">
                              Crosses {taxLabel} period — review proration
                            </p>
                          ) : null}
                        </div>
                        <BookingRevenueForm bookingId={b.id} grossAmount={b.grossAmount} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tap a day to see stays and revenue.</p>
            )}
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead className="text-right">Nights</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono tabular-nums">
                  {fmtDate(b.checkIn)}
                  {b.crossesBoundary ? (
                    <div className="mt-1 text-[11px] text-status-warning">
                      Crosses {taxLabel} period — review proration
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{fmtDate(b.checkOut)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{b.nights}</TableCell>
                <TableCell className="capitalize">{b.platform}</TableCell>
                <TableCell>{b.source.replace("_", " ")}</TableCell>
                <TableCell className="text-right">
                  <BookingRevenueForm bookingId={b.id} grossAmount={b.grossAmount} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
