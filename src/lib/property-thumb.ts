import "server-only";
import { getDocumentStorage } from "@/lib/storage";
import { mapThumbnailUrl } from "@/lib/geo";

export type PropertyThumbInput = {
  coverImageKey: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Resolve a displayable thumbnail URL: cover photo first, else map pin. */
export async function resolvePropertyThumbUrl(
  property: PropertyThumbInput
): Promise<{ src: string; kind: "photo" | "map" } | null> {
  if (property.coverImageKey) {
    try {
      const src = await getDocumentStorage().getSignedUrl(property.coverImageKey, 3600);
      return { src, kind: "photo" };
    } catch {
      // fall through to map
    }
  }
  if (property.latitude != null && property.longitude != null) {
    return {
      src: mapThumbnailUrl(property.latitude, property.longitude),
      kind: "map",
    };
  }
  return null;
}
