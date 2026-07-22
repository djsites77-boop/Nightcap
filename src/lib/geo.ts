/**
 * Geocode + map thumbnail helpers for property listing cards.
 * Nominatim (OSM) for lat/lng (free). Map images go through /api/maps/static
 * which uses the Google Maps Platform key from platform admin when set.
 */

export type Coords = { latitude: number; longitude: number };
export type MapTheme = "light" | "dark";

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

/**
 * Same-origin map proxy URL — the Google key stays server-side.
 * Pass theme so Static Maps styling matches the app (light/dark).
 */
export function mapThumbnailUrl(
  latitude: number,
  longitude: number,
  width = 640,
  height = 360,
  theme: MapTheme = "light"
): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    w: String(width),
    h: String(height),
    theme,
  });
  return `/api/maps/static?${params.toString()}`;
}

/** Swap or set `theme` on an existing `/api/maps/static` URL. */
export function withMapTheme(src: string, theme: MapTheme): string {
  try {
    const url = new URL(src, "http://nightcap.local");
    if (!url.pathname.includes("/api/maps/static")) return src;
    url.searchParams.set("theme", theme);
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return src;
  }
}
