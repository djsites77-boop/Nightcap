"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  addRentalUnit,
  connectCalendar,
  deleteRentalUnit,
  updateRentalUnit,
} from "@/app/actions/properties";

type Connection = {
  id: string;
  platform: string;
  syncStatus: string;
  icalUrlLastFour: string;
  lastSyncedAt: Date | string | null;
};

type Unit = {
  id: string;
  name: string;
  roomsOffered: number;
  calendarConnections: Connection[];
};

export function RentalUnitsPanel({
  propertyId,
  units,
  bedroomCap,
}: {
  propertyId: string;
  units: Unit[];
  bedroomCap: number | null;
}) {
  const total = units.reduce((s, u) => s + u.roomsOffered, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each room below is a separate STR listing (its own Airbnb/VRBO calendar). Cap check uses the
        total bedrooms offered across all rooms
        {bedroomCap != null ? ` (${total} of ${bedroomCap} allowed)` : ""}.
      </p>

      <div className="space-y-3">
        {units.map((unit) => (
          <UnitCard key={unit.id} propertyId={propertyId} unit={unit} canDelete={units.length > 1} />
        ))}
      </div>

      <AddUnitForm propertyId={propertyId} nextIndex={units.length + 1} />
    </div>
  );
}

function UnitCard({
  propertyId,
  unit,
  canDelete,
}: {
  propertyId: string;
  unit: Unit;
  canDelete: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const conn = unit.calendarConnections[0];

  return (
    <div className="rounded-2xl border border-border bg-surface-alt/40 p-4">
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              try {
                await updateRentalUnit(unit.id, fd);
                setEditing(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not update");
              }
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`name-${unit.id}`}>Name</Label>
              <Input id={`name-${unit.id}`} name="name" defaultValue={unit.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`rooms-${unit.id}`}>Bedrooms in this listing</Label>
              <Input
                id={`rooms-${unit.id}`}
                name="roomsOffered"
                type="number"
                min={1}
                defaultValue={unit.roomsOffered}
                required
              />
            </div>
          </div>
          {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-extrabold text-foreground">{unit.name}</p>
            <p className="text-xs font-semibold text-muted-foreground">
              {unit.roomsOffered} bedroom{unit.roomsOffered === 1 ? "" : "s"} offered
            </p>
            <div className="mt-2">
              {conn ? (
                <Badge variant={conn.syncStatus === "connected" ? "ok" : "warning"}>
                  {conn.platform} · {conn.syncStatus}
                </Badge>
              ) : (
                <Badge variant="warning" dot={false}>
                  No calendar yet
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    try {
                      await deleteRentalUnit(unit.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not delete");
                    }
                  })
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {!conn ? (
        <ConnectUnitCalendarForm propertyId={propertyId} rentalUnitId={unit.id} />
      ) : null}
      {error && !editing ? <p className="mt-2 text-sm font-semibold text-status-risk">{error}</p> : null}
    </div>
  );
}

function ConnectUnitCalendarForm({
  propertyId,
  rentalUnitId,
}: {
  propertyId: string;
  rentalUnitId: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="subtle" className="mt-3" onClick={() => setOpen(true)}>
        Connect calendar
      </Button>
    );
  }

  return (
    <form
      className="mt-3 space-y-3 border-t border-border pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("rentalUnitId", rentalUnitId);
        setError(null);
        start(async () => {
          try {
            await connectCalendar(propertyId, fd);
            setOpen(false);
          } catch (err) {
            if (err instanceof Error && err.message !== "NEXT_REDIRECT") {
              setError(err.message);
            } else {
              setOpen(false);
            }
          }
        });
      }}
    >
      <input type="hidden" name="rentalUnitId" value={rentalUnitId} />
      <input type="hidden" name="stayOnPage" value="true" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Platform</Label>
          <NativeSelect name="platform" defaultValue="airbnb">
            <option value="airbnb">Airbnb</option>
            <option value="vrbo">VRBO</option>
            <option value="direct">Direct</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>iCal URL</Label>
          <Input name="icalUrl" required placeholder="https://www.airbnb.ca/calendar/ical/…" />
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Connecting…" : "Save calendar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddUnitForm({ propertyId, nextIndex }: { propertyId: string; nextIndex: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        + Add another room listing
      </Button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-dashed border-border-strong p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await addRentalUnit(propertyId, fd);
            setOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add room");
          }
        });
      }}
    >
      <p className="text-sm font-extrabold">New room listing</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-unit-name">Name</Label>
          <Input id="new-unit-name" name="name" defaultValue={`Room ${nextIndex}`} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-unit-rooms">Bedrooms in this listing</Label>
          <Input id="new-unit-rooms" name="roomsOffered" type="number" min={1} defaultValue={1} required />
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add room"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
