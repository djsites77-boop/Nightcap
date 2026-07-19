"use client";

import * as React from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addManualBooking,
  syncPropertyCalendars,
  updateBookingRevenue,
  uploadDocument,
} from "@/app/actions/property-detail";

export function SyncNowButton({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => syncPropertyCalendars(propertyId))}
    >
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}

export function DocumentUploadForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await uploadDocument(fd);
            e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          }
        });
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="docType">Type</Label>
          <select
            id="docType"
            name="docType"
            className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm"
            defaultValue="insurance"
          >
            <option value="fire_safety_cert">Fire safety certificate</option>
            <option value="insurance">Insurance</option>
            <option value="floor_plan">Floor plan</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expiryDate">Expiry (optional)</Label>
          <Input id="expiryDate" name="expiryDate" type="date" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">File</Label>
        <Input id="file" name="file" type="file" required />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}

export function ManualBookingForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            await addManualBooking(fd);
            e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add booking");
          }
        });
      }}
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="text-sm font-semibold text-foreground">Add manual booking / revenue</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkIn">Check-in</Label>
          <Input id="checkIn" name="checkIn" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkOut">Check-out</Label>
          <Input id="checkOut" name="checkOut" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            name="platform"
            className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm"
            defaultValue="direct"
          >
            <option value="airbnb">Airbnb</option>
            <option value="vrbo">VRBO</option>
            <option value="direct">Direct</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grossAmount">Gross amount (CAD)</Label>
          <Input id="grossAmount" name="grossAmount" type="number" step="0.01" min="0" />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Add booking"}
      </Button>
    </form>
  );
}

export function BookingRevenueForm({
  bookingId,
  grossAmount,
}: {
  bookingId: string;
  grossAmount: number | null;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-center justify-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => updateBookingRevenue(fd));
      }}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Input
        name="grossAmount"
        type="number"
        step="0.01"
        min="0"
        defaultValue={grossAmount ?? ""}
        placeholder="CAD"
        className="h-8 w-24 text-right font-mono text-xs"
      />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
    </form>
  );
}
