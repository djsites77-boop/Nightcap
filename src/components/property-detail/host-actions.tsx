"use client";

import * as React from "react";
import { useTransition } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  addManualBooking,
  syncAllHostCalendars,
  syncPropertyCalendars,
  updateBookingRevenue,
  uploadDocument,
  uploadPropertyCover,
} from "@/app/actions/property-detail";

export function CoverPhotoForm({
  propertyId,
  hasCover,
}: {
  propertyId: string;
  hasCover?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("propertyId", propertyId);
          fd.set("file", file);
          setError(null);
          start(async () => {
            try {
              await uploadPropertyCover(fd);
              e.target.value = "";
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            }
          });
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        <ImagePlus className="size-4" />
        {pending ? "Uploading…" : hasCover ? "Change cover photo" : "Add cover photo"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Optional listing photo for cards and this page — not a compliance document.
      </p>
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
    </div>
  );
}

export function SyncNowButton({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => start(() => syncPropertyCalendars(propertyId))}
    >
      {pending ? "Syncing…" : "Sync this listing"}
    </Button>
  );
}

export function SyncAllCalendarsButton() {
  const [pending, start] = useTransition();
  const [message, setMessage] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await syncAllHostCalendars();
            setMessage(
              res.synced === 0
                ? "No calendars connected yet"
                : `Synced ${res.synced} calendar${res.synced === 1 ? "" : "s"}`
            );
          })
        }
      >
        {pending ? "Syncing…" : "Sync all calendars"}
      </Button>
      {message ? <p className="text-[11px] font-semibold text-muted-foreground">{message}</p> : null}
    </div>
  );
}

export function RegistrationProofForm({ propertyId }: { propertyId: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border-strong bg-surface-alt/40 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.set("propertyId", propertyId);
          fd.set("docType", "registration");
          fd.set("file", file);
          setError(null);
          start(async () => {
            try {
              await uploadDocument(fd);
              e.target.value = "";
            } catch (err) {
              setError(err instanceof Error ? err.message : "Upload failed");
            }
          });
        }}
      />
      <p className="text-xs font-semibold leading-snug text-muted-foreground">
        Upload your registration / licence confirmation to the document vault (PDF or photo).
      </p>
      <Button
        type="button"
        size="sm"
        variant="subtle"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="w-fit"
      >
        <Upload className="size-3.5" />
        {pending ? "Uploading…" : "Upload registration proof"}
      </Button>
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
    </div>
  );
}

export function DocumentUploadForm({ propertyId }: { propertyId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4"
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
          <NativeSelect id="docType" name="docType" defaultValue="insurance">
            <option value="registration">Registration / licence</option>
            <option value="fire_safety_cert">Fire safety certificate</option>
            <option value="insurance">Insurance</option>
            <option value="floor_plan">Floor plan</option>
            <option value="receipt">Receipt</option>
            <option value="other">Other</option>
          </NativeSelect>
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
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
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
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4"
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
          <NativeSelect id="platform" name="platform" defaultValue="direct">
            <option value="airbnb">Airbnb</option>
            <option value="vrbo">VRBO</option>
            <option value="direct">Direct</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grossAmount">Gross amount (CAD)</Label>
          <Input id="grossAmount" name="grossAmount" type="number" step="0.01" min="0" />
        </div>
      </div>
      {error ? <p className="text-sm font-semibold text-status-risk">{error}</p> : null}
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
