import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="-mx-1 w-full overflow-x-auto overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch]">
      <table className={cn("w-full min-w-[32rem] text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-border last:border-0 transition-colors hover:bg-accent-soft/40", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-11 px-3 text-left text-xs font-bold text-muted-foreground first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("h-12 px-3 align-middle first:pl-4 last:pr-4 sm:px-4 sm:first:pl-5 sm:last:pr-5", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
