"use client";

import * as React from "react";
import { FileUp, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Button-styled file picker with optional drop target. Looks clickable. */
export function FilePickField({
  name,
  accept,
  required,
  label = "Choose file",
  hint = "PDF, photo, or CSV",
  className,
  onFileChange,
}: {
  name?: string;
  accept?: string;
  required?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  onFileChange?: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);

  function take(next: File | null) {
    setFile(next);
    onFileChange?.(next);
    if (!next && inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required && !file}
        className="sr-only"
        onChange={(e) => take(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          take(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-3 py-3 transition-colors",
          dragging
            ? "border-accent bg-accent-soft/40"
            : "border-border-strong bg-surface hover:border-accent hover:bg-brand-soft/40"
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {file ? <FileUp className="size-4" strokeWidth={1.75} /> : <Upload className="size-4" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1 text-left">
          {file ? (
            <>
              <p className="truncate text-sm font-bold text-foreground">{file.name}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB · click or drop to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground">{label}</p>
              <p className="text-xs font-medium text-muted-foreground">{hint}</p>
            </>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse
        </Button>
      </div>
    </div>
  );
}
