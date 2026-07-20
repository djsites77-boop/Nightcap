import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        neutral: "bg-brand-soft text-brand",
        ok: "bg-status-ok-soft text-status-ok",
        warning: "bg-status-warning-soft text-status-warning",
        risk: "bg-status-risk-soft text-status-risk",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && (
        <span
          className={cn("size-1.5 rounded-full", {
            "bg-status-ok": variant === "ok",
            "bg-status-warning": variant === "warning",
            "bg-status-risk": variant === "risk",
            "bg-brand": variant === "neutral" || !variant,
          })}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
