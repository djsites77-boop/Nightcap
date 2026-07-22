import { MapPin } from "lucide-react";
import { getPlatformApiKeyPlaintext } from "@/lib/platform-keys";
import { mapThumbnailUrl } from "@/lib/geo";

/**
 * Property location map. Prefers free Maps Embed API (interactive pin);
 * falls back to Static Maps image via our proxy if Embed isn't available.
 */
export async function PropertyMapEmbed({
  latitude,
  longitude,
  label,
  className,
}: {
  latitude: number;
  longitude: number;
  label: string;
  className?: string;
}) {
  const key = await getPlatformApiKeyPlaintext("google_maps");
  const staticSrc = mapThumbnailUrl(latitude, longitude, 640, 360);

  if (!key) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={staticSrc} alt={`Map of ${label}`} className="h-full w-full object-cover" />
      </div>
    );
  }

  const params = new URLSearchParams({
    key,
    q: `${latitude},${longitude}`,
    zoom: "15",
  });

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Static image underneath — visible if Embed iframe fails to paint */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticSrc}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <iframe
        title={`Map of ${label}`}
        src={`https://www.google.com/maps/embed/v1/place?${params.toString()}`}
        className="relative h-full w-full border-0 bg-transparent"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}

export function PropertyMapPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand via-brand to-[#2a3358] text-white/90 ${className ?? ""}`}
    >
      <MapPin className="size-8 opacity-80" strokeWidth={1.75} />
      <span className="px-4 text-center text-xs font-semibold opacity-80">Map unavailable</span>
    </div>
  );
}
