import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent-strong",
        ghost:
          "border border-border-strong text-muted-foreground hover:border-subtle-foreground hover:bg-surface-alt hover:text-foreground",
        subtle: "bg-surface-alt text-foreground hover:bg-surface-sunken",
        destructive: "bg-status-risk text-white hover:opacity-90",
        link: "h-auto p-0 font-semibold text-accent underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 min-h-10 px-4",
        sm: "h-9 min-h-9 px-3 text-xs",
        lg: "h-11 min-h-11 px-6",
        icon: "size-10 min-h-10 min-w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
