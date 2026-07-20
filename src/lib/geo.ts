/**
 * Geocode + map thumbnail helpers for property listing cards.
 * Nominatim (OSM) for lat/lng; staticmap.openstreetmap.de for the image.
 * Always send a identifying User-Agent — Nominatim requires it.
 */

export type Coords = { latitude: number; longitude: number };

export async function geocodeAddress(address: string): Promise<Coords | null> {
  const q = address.trim();
  if (!q) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: {
        "User-Agent": "NitecapSTR/0.1 (host compliance tracker; local-dev)",
        Accept: "application/json",
      },
      // Nominatim asks for max 1 req/sec — fine for create-property cadence
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!rows[0]) return null;
    const latitude = Number(rows[0].lat);
    const longitude = Number(rows[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

/** Static map PNG URL for a property pin (no API key). */
export function mapThumbnailUrl(latitude: number, longitude: number, width = 800, height = 420): string {
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: "15",
    size: `${width}x${height}`,
    maptype: "mapnik",
    markers: `${latitude},${longitude},red-pushpin`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
