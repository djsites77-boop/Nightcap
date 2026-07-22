import { NextRequest, NextResponse } from "next/server";
import { getPlatformApiKeyPlaintext } from "@/lib/platform-keys";
import type { MapTheme } from "@/lib/geo";

/**
 * Proxies Google Maps Static images so the API key never appears in the
 * browser. Applies Nightcap light/dark styling. Falls back to OSM when no key.
 *
 * Google Static Maps max size is 640×640 (use scale=2 for retina).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const width = clampInt(sp.get("w"), 640, 64, 1280);
  const height = clampInt(sp.get("h"), 360, 64, 1280);
  const theme: MapTheme = sp.get("theme") === "dark" ? "dark" : "light";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const googleKey = await getPlatformApiKeyPlaintext("google_maps");
  const upstream = googleKey
    ? googleStaticMapUrl(lat, lng, width, height, googleKey, theme)
    : osmStaticMapUrl(lat, lng, width, height);

  try {
    const res = await fetch(upstream, {
      cache: "force-cache",
      headers: googleKey ? undefined : { "User-Agent": "NitecapSTR/0.1 (map thumbnail proxy)" },
    });
    if (!res.ok) {
      if (googleKey) {
        const osm = await fetch(osmStaticMapUrl(lat, lng, width, height), {
          headers: { "User-Agent": "NitecapSTR/0.1 (map thumbnail proxy)" },
        });
        if (osm.ok) {
          const body = await osm.arrayBuffer();
          return new NextResponse(body, {
            headers: {
              "Content-Type": osm.headers.get("content-type") ?? "image/png",
              "Cache-Control": "private, max-age=3600",
            },
          });
        }
      }
      return NextResponse.json({ error: "Map upstream failed" }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    if (!contentType.includes("image")) {
      return NextResponse.json({ error: "Map upstream returned non-image" }, { status: 502 });
    }
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Map fetch failed" }, { status: 502 });
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw == null || raw === "" ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Nightcap palette → Google Static Maps style rules. */
function nightcapMapStyles(theme: MapTheme): string[] {
  if (theme === "dark") {
    return [
      "feature:all|element:geometry|color:0x121826",
      "feature:all|element:labels.text.fill|color:0xa7b0c4",
      "feature:all|element:labels.text.stroke|color:0x070a12",
      "feature:all|element:labels.icon|visibility:off",
      "feature:administrative|element:geometry.stroke|color:0x252d44",
      "feature:administrative.land_parcel|visibility:off",
      "feature:poi|element:geometry|color:0x1a2234",
      "feature:poi|element:labels.text.fill|color:0x7c869e",
      "feature:poi.park|element:geometry|color:0x152018",
      "feature:poi.park|element:labels.text.fill|color:0x4ade80",
      "feature:road|element:geometry|color:0x252d44",
      "feature:road|element:geometry.stroke|color:0x070a12",
      "feature:road|element:labels.text.fill|color:0xa7b0c4",
      "feature:road.highway|element:geometry|color:0x2a3358",
      "feature:road.highway|element:geometry.stroke|color:0x121826",
      "feature:transit|element:geometry|color:0x1a2234",
      "feature:water|element:geometry|color:0x0b0f1a",
      "feature:water|element:labels.text.fill|color:0x5b657a",
    ];
  }

  return [
    "feature:all|element:geometry|color:0xeef1f7",
    "feature:all|element:labels.text.fill|color:0x5b657a",
    "feature:all|element:labels.text.stroke|color:0xffffff",
    "feature:all|element:labels.icon|visibility:off",
    "feature:administrative|element:geometry.stroke|color:0xd8deea",
    "feature:poi|element:geometry|color:0xe4e8f1",
    "feature:poi|element:labels.text.fill|color:0x8b94a8",
    "feature:poi.park|element:geometry|color:0xdcefe3",
    "feature:road|element:geometry|color:0xffffff",
    "feature:road|element:geometry.stroke|color:0xd8deea",
    "feature:road|element:labels.text.fill|color:0x5b657a",
    "feature:road.highway|element:geometry|color:0xfff4d6",
    "feature:road.highway|element:geometry.stroke|color:0xe8a017",
    "feature:transit|element:geometry|color:0xe4e8f1",
    "feature:water|element:geometry|color:0xc5d4e8",
    "feature:water|element:labels.text.fill|color:0x5b657a",
  ];
}

function googleStaticMapUrl(
  lat: number,
  lng: number,
  width: number,
  height: number,
  key: string,
  theme: MapTheme
): string {
  const scale = 2;
  const maxLogical = 640;
  const fit = Math.min(1, maxLogical / Math.max(width, height));
  const w = Math.max(1, Math.round(width * fit));
  const h = Math.max(1, Math.round(height * fit));
  const marker = theme === "dark" ? "0xF0B429" : "0xE8A017";

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: `${w}x${h}`,
    scale: String(scale),
    maptype: "roadmap",
    markers: `color:${marker}|${lat},${lng}`,
    key,
  });
  for (const style of nightcapMapStyles(theme)) {
    params.append("style", style);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function osmStaticMapUrl(lat: number, lng: number, width: number, height: number): string {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: `${Math.min(width, 800)}x${Math.min(height, 800)}`,
    maptype: "mapnik",
    markers: `${lat},${lng},red-pushpin`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}
