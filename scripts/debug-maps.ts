import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { decryptSecret } from "../src/lib/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function geocodeAddress(address: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "NitecapSTR/0.1 (debug)",
      Accept: "application/json",
    },
  });
  console.log("nominatim status", res.status);
  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  console.log("nominatim rows", rows.slice(0, 1));
  if (!rows[0]) return null;
  return { latitude: Number(rows[0].lat), longitude: Number(rows[0].lon) };
}

async function main() {
  const props = await prisma.property.findMany({
    select: {
      id: true,
      nickname: true,
      address: true,
      latitude: true,
      longitude: true,
      coverImageKey: true,
    },
  });
  console.log("properties:", JSON.stringify(props, null, 2));

  const keyRow = await prisma.platformApiKey.findUnique({ where: { keyName: "google_maps" } });
  console.log("key row:", keyRow ? { lastFour: keyRow.lastFour } : null);
  if (keyRow) {
    const key = decryptSecret({ ciphertext: keyRow.ciphertext, iv: keyRow.iv });
    console.log("key decrypted ok, length", key.length);

    const lat = props.find((p) => p.latitude != null)?.latitude ?? 43.6405;
    const lng = props.find((p) => p.longitude != null)?.longitude ?? -79.377;
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: "15",
      size: "400x240",
      maptype: "roadmap",
      markers: `color:red|${lat},${lng}`,
      key,
    });
    const mapRes = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
    console.log("static map status", mapRes.status, mapRes.headers.get("content-type"));
    if (!mapRes.ok || !(mapRes.headers.get("content-type") ?? "").includes("image")) {
      console.log("static map body", (await mapRes.text()).slice(0, 400));
    }
  }

  for (const p of props) {
    if (p.latitude == null || p.longitude == null) {
      console.log("missing coords for", p.nickname, p.address);
      const coords = await geocodeAddress(p.address);
      console.log("geocode:", coords);
      if (coords) {
        await prisma.property.update({
          where: { id: p.id },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
        console.log("backfilled coords for", p.nickname);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
