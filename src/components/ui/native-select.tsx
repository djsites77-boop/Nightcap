import * as React from "react";
import { cn } from "@/lib/utils";

/** Native `<select>` styled to match Input — use when FormData `name` is required. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-12 min-h-12 w-full appearance-none rounded-2xl border border-border-strong bg-surface bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat px-4 py-2 pr-10 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%236b7280%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        className
      )}
      {...props}
    />
  );
}

export { NativeSelect };
