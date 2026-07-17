import { cn } from "@/lib/utils";

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M17.5 3.2a9 9 0 1 0 5.3 15.9A10.6 10.6 0 0 1 17.5 3.2Z"
        fill="var(--accent-strong)"
      />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-semibold tracking-tight",
        light ? "text-white" : "text-foreground"
      )}
    >
      Nightcap
    </span>
  );
}
