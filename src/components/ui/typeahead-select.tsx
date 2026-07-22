"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type TypeaheadOption = { value: string; label: string };

/**
 * Form-friendly searchable select: type to filter, pick a match.
 * Submits via a hidden input with `name`.
 */
export function TypeaheadSelect({
  id,
  name,
  options,
  defaultValue,
  placeholder = "Type to search…",
  className,
  required,
}: {
  id?: string;
  name: string;
  options: TypeaheadOption[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  const initial = options.find((o) => o.value === defaultValue) ?? null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(initial?.label ?? "");
  const [value, setValue] = React.useState(initial?.value ?? "");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(opt: TypeaheadOption) {
    setValue(opt.value);
    setQuery(opt.label);
    setOpen(false);
  }

  function onBlurQuery() {
    // Resolve exact / unique match when leaving the field
    const q = query.trim().toLowerCase();
    const exact = options.find((o) => o.label.toLowerCase() === q || o.value.toLowerCase() === q);
    if (exact) {
      pick(exact);
      return;
    }
    if (filtered.length === 1 && filtered[0]) {
      pick(filtered[0]);
      return;
    }
    const current = options.find((o) => o.value === value);
    if (current) setQuery(current.label);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value} required={required} />
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          required={required && !value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // Clear committed value until they pick / resolve
            setValue("");
          }}
          onBlur={onBlurQuery}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              pick(filtered[0]);
            }
          }}
          className="pr-10"
        />
        <ChevronsUpDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
          strokeWidth={1.75}
        />
      </div>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-border bg-surface p-1.5 shadow-lift"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-brand-soft",
                    opt.value === value && "bg-brand-soft"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-accent-strong",
                      opt.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
