"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MapPin } from "lucide-react";
import { withMapTheme, type MapTheme } from "@/lib/geo";
import { cn } from "@/lib/utils";

function useMapTheme(): MapTheme {
  const { resolvedTheme } = useTheme();
  const [theme, setTheme] = useState<MapTheme>("light");
  useEffect(() => {
    setTheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme]);
  return theme;
}

/** Listing thumbnail — photo or themed map, with a pin fallback if the image fails. */
export function PropertyThumb({
  src,
  kind,
  alt,
  className,
}: {
  src: string | null;
  kind: "photo" | "map" | null;
  alt: string;
  className?: string;
}) {
  const theme = useMapTheme();
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src && kind === "map" ? withMapTheme(src, theme) : src;
  const showImg = resolvedSrc && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-brand-soft", className)}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={resolvedSrc}
          src={resolvedSrc}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand via-brand to-[#2a3358] text-brand-foreground">
          <MapPin className="size-8 opacity-80" strokeWidth={1.75} />
          <span className="px-4 text-center text-xs font-semibold opacity-80">Map coming soon</span>
        </div>
      )}
      {kind && showImg && (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {kind === "photo" ? "Photo" : "Map"}
        </span>
      )}
    </div>
  );
}
