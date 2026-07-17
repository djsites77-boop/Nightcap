"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

export function ConnectCalendarForm({
  action,
  existing,
  propertyId,
}: {
  action: (formData: FormData) => Promise<void>;
  existing: Connection[];
  propertyId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {existing.map((c) => (
        <div
          key={c.id}
          className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-3.5 py-3"
        >
          <span className="size-2 rounded-full bg-status-ok" />
          <div className="text-sm">
            <div className="font-semibold text-foreground capitalize">{c.platform} connected</div>
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
        <div className="mb-4 flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          {/* Select.Root's `name` renders a native bubble input so this posts with the form. */}
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
          <Label htmlFor="icalUrl">iCal export URL</Label>
          <Input
            id="icalUrl"
            name="icalUrl"
            required
            placeholder="https://www.airbnb.ca/calendar/ical/…"
          />
        </div>

        <div className="mb-5 flex items-start gap-2 text-xs text-subtle-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <span>Your calendar URL is encrypted at rest and never shown in full again after this step.</span>
        </div>

        {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/properties/${propertyId}/registration`)}
          >
            Skip for now
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Connecting…" : "Continue →"}
          </Button>
        </div>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/properties/new" className="font-semibold text-accent">
          ← Back
        </Link>
      </p>
    </div>
  );
}
