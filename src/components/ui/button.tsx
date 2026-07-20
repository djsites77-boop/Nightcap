import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-[background-color,transform,opacity,box-shadow] duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground shadow-soft hover:bg-accent-strong",
        ghost:
          "border border-border-strong bg-surface/60 text-foreground hover:bg-brand-soft",
        subtle: "bg-brand-soft text-brand hover:bg-surface-alt",
        destructive: "bg-status-risk text-white hover:opacity-90",
        link: "h-auto rounded-none p-0 font-bold text-accent-strong underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-11 min-h-11 px-5",
        sm: "h-9 min-h-9 px-4 text-xs",
        lg: "h-12 min-h-12 px-7 text-base",
        icon: "size-11 min-h-11 min-w-11",
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
