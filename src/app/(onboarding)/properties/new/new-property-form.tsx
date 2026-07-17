"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Municipality {
  id: string;
  name: string;
  province: string;
  active: boolean;
}

export function NewPropertyForm({
  municipalities,
  action,
}: {
  municipalities: Municipality[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [unitType, setUnitType] = useState<"entire_home" | "partial_unit">("entire_home");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const firstActive = municipalities.find((m) => m.active)?.id ?? "";
  const [municipalityId, setMunicipalityId] = useState(firstActive);
  const [autoMatched, setAutoMatched] = useState(false);

  // Best-effort jurisdiction suggestion from the address text — not real
  // geocoding (no provider wired up), just a name match against the active
  // municipality list. The explicit picker below remains the source of truth.
  function handleAddressChange(address: string) {
    const match = municipalities.find((m) => m.active && address.toLowerCase().includes(m.name.toLowerCase()));
    if (match) {
      setMunicipalityId(match.id);
      setAutoMatched(true);
    } else {
      setAutoMatched(false);
    }
  }

  return (
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
        <Label htmlFor="nickname">Nickname</Label>
        <Input id="nickname" name="nickname" required placeholder="Queen St Loft" />
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          required
          placeholder="412 Queen St W, Toronto, ON"
          onChange={(e) => handleAddressChange(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <Label>Municipality</Label>
        {autoMatched && (
          <p className="text-xs text-accent">Matched from the address you entered — change it below if wrong.</p>
        )}
        <div className="flex flex-col gap-2">
          {municipalities.map((m) => (
            <label
              key={m.id}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3.5 py-2.5",
                m.active ? "border-accent bg-accent-soft" : "cursor-not-allowed border-border opacity-60"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="radio"
                  name="municipalityId"
                  value={m.id}
                  checked={municipalityId === m.id}
                  onChange={() => setMunicipalityId(m.id)}
                  disabled={!m.active}
                  required
                  className="accent-accent"
                />
                {m.name}
              </span>
              {m.active ? (
                <Badge variant="ok">Enabled</Badge>
              ) : (
                <span className="rounded-full border border-border-strong px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-subtle-foreground">
                  Coming soon
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <Label>Unit type</Label>
        <div className="flex gap-2.5">
          {(
            [
              { value: "entire_home", title: "Entire home", sub: "180-night annual cap applies" },
              { value: "partial_unit", title: "Partial unit", sub: "Room rental, no annual cap" },
            ] as const
          ).map((tile) => (
            <label
              key={tile.value}
              className={cn(
                "flex-1 cursor-pointer rounded-lg border px-3.5 py-3",
                unitType === tile.value ? "border-accent bg-accent-soft" : "border-border-strong"
              )}
            >
              <input
                type="radio"
                name="unitType"
                value={tile.value}
                checked={unitType === tile.value}
                onChange={() => setUnitType(tile.value)}
                className="sr-only"
              />
              <div className="text-sm font-bold text-foreground">{tile.title}</div>
              <div className="mt-0.5 text-xs text-subtle-foreground">{tile.sub}</div>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-1 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bedroomCount">Bedrooms in unit</Label>
          <Input id="bedroomCount" name="bedroomCount" type="number" min={1} required defaultValue={2} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="roomsOffered">Rooms offered for STR</Label>
          <Input
            id="roomsOffered"
            name="roomsOffered"
            type="number"
            min={0}
            disabled={unitType !== "partial_unit"}
            defaultValue={unitType === "partial_unit" ? 1 : 0}
          />
        </div>
      </div>
      <p className="mb-5 text-xs text-subtle-foreground">
        Rooms-offered only applies to partial-unit listings — Toronto caps this at whichever is lower: 3, or
        one fewer than total bedrooms.
      </p>

      {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Continue →"}
      </Button>
    </form>
  );
}
