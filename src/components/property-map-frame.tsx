"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Crisp vector Google map (Maps Embed — free). Dark mode uses a careful
 * invert filter so we don't stretch a low-res Static bitmap across the hero.
 */
export function PropertyMapFrame({
  embedSrc,
  label,
  className,
  mapsHref,
}: {
  embedSrc: string | null;
  label: string;
  className?: string;
  mapsHref: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  if (!embedSrc) {
    return <PropertyMapPlaceholder className={className} />;
  }

  return (
    <div className={cn("relative overflow-hidden bg-brand-soft", className)}>
      <iframe
        title={`Map of ${label}`}
        src={embedSrc}
        className={cn(
          "absolute inset-0 h-full w-full border-0",
          dark && "map-embed-dark"
        )}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/70"
      >
        Open in Maps
        <ExternalLink className="size-3" strokeWidth={2} />
      </a>
      <style jsx global>{`
        .map-embed-dark {
          filter: invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(0.92);
        }
      `}</style>
    </div>
  );
}

export function PropertyMapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand via-brand to-[#2a3358] text-brand-foreground",
        className
      )}
    >
      <MapPin className="size-8 opacity-80" strokeWidth={1.75} />
      <span className="px-4 text-center text-xs font-semibold opacity-80">Map unavailable</span>
    </div>
  );
}
