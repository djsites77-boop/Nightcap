"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Connection {
  id: string;
  platform: string;
  icalUrlLastFour: string;
  syncStatus: string;
}

interface RoomUnit {
  id: string;
  name: string;
  roomsOffered: number;
  connections: Connection[];
}

export function ConnectCalendarForm({
  action,
  existing,
  propertyId,
  units = [],
  isPartial = false,
}: {
  action: (formData: FormData) => Promise<void>;
  existing: Connection[];
  propertyId: string;
  units?: RoomUnit[];
  isPartial?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaultUnit =
    units.find((u) => u.connections.length === 0)?.id ?? units[0]?.id ?? "";

  if (isPartial && units.length > 0) {
    const linked = units.filter((u) => u.connections.length > 0).length;
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Each room listing needs its own Airbnb/VRBO calendar URL. Linked {linked} of{" "}
          {units.length}.
        </p>

        <div className="space-y-3">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="rounded-2xl border border-border bg-surface-alt/50 px-3.5 py-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-foreground">{unit.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {unit.roomsOffered} bedroom{unit.roomsOffered === 1 ? "" : "s"} offered
                  </p>
                </div>
                {unit.connections[0] ? (
                  <Badge variant="ok">{unit.connections[0].platform} linked</Badge>
                ) : (
                  <Badge variant="warning" dot={false}>
                    Needs calendar
                  </Badge>
                )}
              </div>
              {unit.connections.map((c) => (
                <p key={c.id} className="font-mono text-xs text-subtle-foreground">
                  ••••••••••••••••{c.icalUrlLastFour} ({c.syncStatus})
                </p>
              ))}
            </div>
          ))}
        </div>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await action(formData);
              } catch (e) {
                if (e instanceof Error && e.message !== "NEXT_REDIRECT") setError(e.message);
              }
            });
          }}
        >
          <div className="mb-4 flex flex-col gap-1.5">
            <Label htmlFor="rentalUnitId">Room listing</Label>
            <Select name="rentalUnitId" defaultValue={defaultUnit}>
              <SelectTrigger id="rentalUnitId">
                <SelectValue placeholder="Choose room" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.connections.length > 0 ? " (already linked)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CalendarFields />
          {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button type="button" variant="ghost" className="sm:flex-1" asChild>
              <Link href={`/properties/${propertyId}/registration`}>
                {linked === units.length ? "Continue →" : "Skip remaining →"}
              </Link>
            </Button>
            <Button type="submit" className="sm:flex-1" disabled={pending || !defaultUnit}>
              {pending ? "Connecting…" : "Connect this room"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {existing.map((c) => (
        <div
          key={c.id}
          className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-3.5 py-3"
        >
          <span className="size-2 rounded-full bg-status-ok" />
          <div className="text-sm">
            <div className="font-semibold capitalize text-foreground">{c.platform} connected</div>
            <div className="font-mono text-xs text-subtle-foreground">
              stored as ••••••••••••••••{c.icalUrlLastFour} (encrypted)
            </div>
          </div>
        </div>
      ))}

      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            try {
              await action(formData);
            } catch (e) {
              if (e instanceof Error && e.message !== "NEXT_REDIRECT") setError(e.message);
            }
          });
        }}
      >
        <CalendarFields />
        {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button type="button" variant="ghost" className="sm:flex-1" asChild>
            <Link href={`/properties/${propertyId}/registration`}>Skip for now</Link>
          </Button>
          <Button type="submit" className="sm:flex-1" disabled={pending}>
            {pending ? "Connecting…" : "Continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CalendarFields() {
  return (
    <>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="platform">Platform</Label>
        <Select name="platform" defaultValue="airbnb">
          <SelectTrigger id="platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="airbnb">Airbnb</SelectItem>
            <SelectItem value="vrbo">VRBO</SelectItem>
            <SelectItem value="direct">Direct booking</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="icalUrl">This listing&apos;s iCal export URL</Label>
        <Input
          id="icalUrl"
          name="icalUrl"
          required
          placeholder="https://www.airbnb.ca/calendar/ical/…"
        />
        <p className="text-xs text-subtle-foreground">
          In Airbnb: Calendar → Availability settings → Export calendar. Use that listing&apos;s
          link only — not another room or property&apos;s.
        </p>
      </div>
      <div className="mb-5 flex items-start gap-2 text-xs text-subtle-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        <span>Your calendar URL is encrypted at rest and never shown in full again after this step.</span>
      </div>
    </>
  );
}
