import { emitProgress } from "../progress";

export interface PlacesResult {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  types: string[];
  isListed: boolean;
  mapsUrl: string;
}

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

export async function findBusinessOnGoogle(
  businessName: string,
  address: string,
  sessionId: string
): Promise<PlacesResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    emitProgress(sessionId, "Google Places: API key not configured, skipping", "warning");
    return null;
  }

  try {
    const query = encodeURIComponent(`${businessName} ${address || "Toronto Ontario"}`);
    emitProgress(sessionId, `Google Places: Searching for "${businessName}"...`, "info");

    const searchRes = await fetch(
      `${PLACES_BASE}/textsearch/json?query=${query}&key=${key}`
    );
    if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);

    const searchData = await searchRes.json() as {
      status: string;
      results?: Array<{
        place_id: string;
        name: string;
        formatted_address: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
      }>;
    };

    if (searchData.status !== "OK" || !searchData.results?.length) {
      emitProgress(sessionId, `Google Places: Business not found on Google Maps`, "warning");
      return { placeId: "", name: businessName, address: address || "", phone: "", website: "", rating: 0, reviewCount: 0, types: [], isListed: false, mapsUrl: "" };
    }

    const place = searchData.results[0];

    // Get full details
    const detailRes = await fetch(
      `${PLACES_BASE}/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types&key=${key}`
    );
    const detailData = await detailRes.json() as {
      result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
      };
    };
    const detail = detailData.result || {};

    const result: PlacesResult = {
      placeId: place.place_id,
      name: detail.name || place.name,
      address: detail.formatted_address || place.formatted_address,
      phone: detail.formatted_phone_number || "",
      website: detail.website || "",
      rating: detail.rating || place.rating || 0,
      reviewCount: detail.user_ratings_total || place.user_ratings_total || 0,
      types: detail.types || place.types || [],
      isListed: true,
      mapsUrl: `https://maps.google.com/?cid=${place.place_id}`,
    };

    emitProgress(
      sessionId,
      `Google Places: Found! "${result.name}" — ⭐ ${result.rating} (${result.reviewCount} reviews), ${result.address}`,
      "success"
    );

    return result;
  } catch (err) {
    emitProgress(
      sessionId,
      `Google Places: ${err instanceof Error ? err.message : "lookup failed"}`,
      "warning"
    );
    return null;
  }
}

export async function enrichBusinessFromPlaces(
  websiteUrl: string,
  sessionId: string
): Promise<PlacesResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  try {
    const domain = new URL(websiteUrl).hostname.replace("www.", "");
    emitProgress(sessionId, `Google Places: Looking up business by domain ${domain}...`, "info");

    // Search by website domain
    const res = await fetch(
      `${PLACES_BASE}/textsearch/json?query=${encodeURIComponent(domain + " Toronto")}&key=${key}`
    );
    const data = await res.json() as {
      status: string;
      results?: Array<{
        place_id: string;
        name: string;
        formatted_address: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
      }>;
    };

    if (data.status !== "OK" || !data.results?.length) return null;

    const place = data.results[0];
    const detailRes = await fetch(
      `${PLACES_BASE}/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types&key=${key}`
    );
    const detailData = await detailRes.json() as {
      result?: {
        name?: string;
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
        types?: string[];
      };
    };
    const detail = detailData.result || {};

    return {
      placeId: place.place_id,
      name: detail.name || place.name,
      address: detail.formatted_address || "",
      phone: detail.formatted_phone_number || "",
      website: detail.website || websiteUrl,
      rating: detail.rating || 0,
      reviewCount: detail.user_ratings_total || 0,
      types: detail.types || [],
      isListed: true,
      mapsUrl: `https://maps.google.com/maps?q=${encodeURIComponent(detail.name || place.name)}`,
    };
  } catch {
    return null;
  }
}
