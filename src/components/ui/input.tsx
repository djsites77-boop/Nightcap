import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 min-h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-subtle-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-subtle-foreground sm:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
