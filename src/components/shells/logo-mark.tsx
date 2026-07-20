import { cn } from "@/lib/utils";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="15" fill="var(--brand)" />
      <path
        d="M21.5 9.2a8.2 8.2 0 1 0 4.6 14.2A9.6 9.6 0 0 1 21.5 9.2Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

export function Wordmark({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "text-xl font-extrabold tracking-tight",
        light ? "text-white" : "text-brand",
        className
      )}
    >
      Nitecap
    </span>
  );
}
