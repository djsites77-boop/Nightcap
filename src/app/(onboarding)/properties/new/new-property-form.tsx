"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Municipality {
  id: string;
  name: string;
  province: string;
  active: boolean;
  nightCapNights: number | null;
  partialUnitCap: {
    maxBedroomsSimultaneous: number | null;
    oneFewerThanTotal: boolean;
  } | null;
}

function roomsOfferedHelp(muni: Municipality | null, bedroomCount: number): string {
  if (!muni) {
    return "Rooms offered only applies to partial-unit listings. Pick a municipality to see its local cap.";
  }

  const cap = muni.partialUnitCap;
  if (!cap || cap.maxBedroomsSimultaneous == null) {
    return `Rooms offered only applies to partial-unit listings. ${muni.name} has no partial-unit bedroom cap configured yet.`;
  }

  const max = cap.maxBedroomsSimultaneous;
  if (cap.oneFewerThanTotal) {
    const computed = Math.max(0, Math.min(max, bedroomCount - 1));
    return `Rooms offered only applies to partial-unit listings. ${muni.name} caps this at whichever is lower: ${max}, or one fewer than total bedrooms (currently ${computed} for ${bedroomCount} bedroom${bedroomCount === 1 ? "" : "s"}).`;
  }

  return `Rooms offered only applies to partial-unit listings. ${muni.name} caps simultaneous STR rooms at ${max}.`;
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
  const [bedroomCount, setBedroomCount] = useState(2);

  const firstActive = municipalities.find((m) => m.active)?.id ?? "";
  const [municipalityId, setMunicipalityId] = useState(firstActive);
  const [autoMatched, setAutoMatched] = useState(false);

  const selected = municipalities.find((m) => m.id === municipalityId) ?? null;
  const entireHomeSub =
    selected?.nightCapNights != null
      ? `${selected.nightCapNights}-night annual cap applies`
      : selected
        ? `No annual night cap configured for ${selected.name}`
        : "Annual night cap depends on municipality";

  // Best-effort jurisdiction suggestion from the address text — not real
  // geocoding (no provider wired up), just a name match against the active
  // municipality list. The explicit picker below remains the source of truth.
  function handleAddressChange(address: string) {
    const match = municipalities.find(
      (m) => m.active && address.toLowerCase().includes(m.name.toLowerCase())
    );
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
        <Input id="nickname" name="nickname" required placeholder="e.g. Downtown loft" />
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          required
          placeholder="Street, city, province"
          onChange={(e) => handleAddressChange(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="municipality-search">Municipality</Label>
        {autoMatched && (
          <p className="text-xs font-medium text-accent-strong">
            Matched from your address — change it if that&apos;s wrong.
          </p>
        )}
        <MunicipalityCombobox
          municipalities={municipalities}
          value={municipalityId}
          onChange={(id) => {
            setMunicipalityId(id);
            setAutoMatched(false);
          }}
        />
        <input type="hidden" name="municipalityId" value={municipalityId} required />
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <Label>Unit type</Label>
        <div className="flex gap-2.5">
          {(
            [
              { value: "entire_home" as const, title: "Entire home", sub: entireHomeSub },
              {
                value: "partial_unit" as const,
                title: "Partial unit",
                sub: "Room rental, no annual night cap",
              },
            ]
          ).map((tile) => (
            <label
              key={tile.value}
              className={cn(
                "flex-1 cursor-pointer rounded-2xl border px-3.5 py-3",
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
          <Input
            id="bedroomCount"
            name="bedroomCount"
            type="number"
            min={1}
            required
            value={bedroomCount}
            onChange={(e) => setBedroomCount(Math.max(1, Number(e.target.value) || 1))}
          />
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
      <p className="mb-5 text-xs leading-relaxed text-subtle-foreground">
        {roomsOfferedHelp(selected, bedroomCount)}
      </p>

      {error && <p className="mb-3 text-sm text-status-risk">{error}</p>}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button type="button" variant="ghost" className="sm:flex-1" asChild>
          <Link href="/dashboard">Cancel</Link>
        </Button>
        <Button type="submit" className="sm:flex-1" disabled={pending || !municipalityId}>
          {pending ? "Saving…" : "Continue →"}
        </Button>
      </div>
    </form>
  );
}

function MunicipalityCombobox({
  municipalities,
  value,
  onChange,
}: {
  municipalities: Municipality[];
  value: string;
  onChange: (id: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = municipalities.find((m) => m.id === value) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery(selected ? `${selected.name}, ${selected.province}` : "");
  }, [selected, open]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...municipalities].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.province.toLowerCase().includes(q) ||
        `${m.name}, ${m.province}`.toLowerCase().includes(q)
    );
  }, [municipalities, query]);

  function pick(m: Municipality) {
    if (!m.active) return;
    onChange(m.id);
    setQuery(`${m.name}, ${m.province}`);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <Input
          ref={inputRef}
          id="municipality-search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search city or province…"
          value={query}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              const first = filtered.find((m) => m.active);
              if (first) pick(first);
            }
          }}
          className="pl-10 pr-10"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle municipality list"
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-brand-soft hover:text-foreground"
          onClick={() => {
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
        >
          <ChevronsUpDown className="size-4" />
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-1.5 shadow-lift"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">No cities match “{query.trim()}”</li>
          ) : (
            filtered.map((m) => {
              const isSelected = m.id === value;
              return (
                <li key={m.id} role="option" aria-selected={isSelected} aria-disabled={!m.active}>
                  <button
                    type="button"
                    disabled={!m.active}
                    onClick={() => pick(m)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      m.active
                        ? isSelected
                          ? "bg-accent-soft text-foreground"
                          : "hover:bg-brand-soft"
                        : "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Check
                      className={cn("size-4 shrink-0", isSelected ? "text-accent-strong" : "opacity-0")}
                    />
                    <span className="min-w-0 flex-1 font-semibold">
                      {m.name}
                      <span className="font-medium text-muted-foreground">, {m.province}</span>
                    </span>
                    {!m.active && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-subtle-foreground">
                        Soon
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
