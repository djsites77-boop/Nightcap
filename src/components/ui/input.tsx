import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 min-h-12 w-full rounded-2xl border border-border-strong bg-surface px-4 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-subtle-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:bg-surface-alt dark:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export { Input };
