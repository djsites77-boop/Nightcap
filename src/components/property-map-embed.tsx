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

  if (!key) {
    return <PropertyMapPlaceholder className={className} />;
  }

  const params = new URLSearchParams({
    key,
    q: `${latitude},${longitude}`,
    zoom: "15",
  });

  return (
    <iframe
      title={`Map of ${label}`}
      src={`https://www.google.com/maps/embed/v1/place?${params.toString()}`}
      className={`h-full w-full border-0 ${className ?? ""}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
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
