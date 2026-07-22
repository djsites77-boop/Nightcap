import { getPlatformApiKeyPlaintext } from "@/lib/platform-keys";
import { PropertyMapFrame, PropertyMapPlaceholder } from "@/components/property-map-frame";

/**
 * Property location map — Maps Embed API (sharp vector tiles, free).
 * Avoids stretching a Static Maps bitmap across the hero.
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
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;

  if (!key) {
    return <PropertyMapPlaceholder className={className} />;
  }

  const params = new URLSearchParams({
    key,
    q: `${latitude},${longitude}`,
    zoom: "15",
    maptype: "roadmap",
  });

  return (
    <PropertyMapFrame
      embedSrc={`https://www.google.com/maps/embed/v1/place?${params.toString()}`}
      label={label}
      className={className}
      mapsHref={mapsHref}
    />
  );
}

export { PropertyMapPlaceholder };
