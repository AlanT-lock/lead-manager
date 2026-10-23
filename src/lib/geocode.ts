/**
 * Adresses : Google Places (API « New ») si GOOGLE_MAPS_API_KEY est défini, sinon
 * repli sur la Base Adresse Nationale (gratuite, sans clé, France uniquement).
 * Appelé côté serveur uniquement : la clé ne doit jamais atteindre le navigateur.
 */

export interface AddressSuggestion {
  id: string;
  label: string;
  lat?: number;
  lng?: number;
}

export interface GeocodedAddress {
  label: string;
  lat: number;
  lng: number;
}

const GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places";
const GOOGLE_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const BAN_URL = "https://api-adresse.data.gouv.fr/search/";

function googleKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY || undefined;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface BanResponse {
  features?: { properties?: { id?: string; label?: string }; geometry?: { coordinates?: [number, number] } }[];
}

async function banSearch(query: string, limit: number): Promise<AddressSuggestion[]> {
  const json = (await fetchJson(`${BAN_URL}?q=${encodeURIComponent(query)}&limit=${limit}`)) as BanResponse;
  return (json.features ?? []).flatMap((f) => {
    const label = f.properties?.label;
    const coords = f.geometry?.coordinates;
    if (!label || !coords) return [];
    return [{ id: f.properties?.id ?? label, label, lat: coords[1], lng: coords[0] }];
  });
}

interface GoogleAutocompleteResponse {
  suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[];
}

export async function autocompleteAddress(input: string): Promise<AddressSuggestion[]> {
  const key = googleKey();
  if (key) {
    try {
      const json = (await fetchJson(GOOGLE_AUTOCOMPLETE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
        body: JSON.stringify({ input, languageCode: "fr", includedRegionCodes: ["fr"] }),
      })) as GoogleAutocompleteResponse;
      return (json.suggestions ?? []).flatMap((s) => {
        const p = s.placePrediction;
        return p?.placeId && p.text?.text ? [{ id: p.placeId, label: p.text.text }] : [];
      });
    } catch (err) {
      console.error("[sav] autocomplete Google en échec, repli BAN", err);
    }
  }
  return banSearch(input, 5).catch(() => []);
}

interface GooglePlace {
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

function fromGooglePlace(place: GooglePlace | undefined): GeocodedAddress | null {
  const lat = place?.location?.latitude;
  const lng = place?.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { label: place?.formattedAddress ?? "", lat, lng };
}

/** Coordonnées d'un lieu retourné par l'autocomplete Google. */
export async function placeDetails(placeId: string): Promise<GeocodedAddress | null> {
  const key = googleKey();
  if (!key) return null;
  try {
    const json = (await fetchJson(`${GOOGLE_PLACES_URL}/${encodeURIComponent(placeId)}?languageCode=fr`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "formattedAddress,location" },
    })) as GooglePlace;
    return fromGooglePlace(json);
  } catch (err) {
    console.error("[sav] détails Google en échec", err);
    return null;
  }
}

/** Géocode une adresse saisie à la main (sans passer par une suggestion). */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const key = googleKey();
  if (key) {
    try {
      const json = (await fetchJson(GOOGLE_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.formattedAddress,places.location",
        },
        body: JSON.stringify({ textQuery: address, languageCode: "fr", regionCode: "FR", pageSize: 1 }),
      })) as { places?: GooglePlace[] };
      const found = fromGooglePlace(json.places?.[0]);
      if (found) return found;
    } catch (err) {
      console.error("[sav] géocodage Google en échec, repli BAN", err);
    }
  }
  try {
    const [first] = await banSearch(address, 1);
    return first?.lat !== undefined && first.lng !== undefined
      ? { label: first.label, lat: first.lat, lng: first.lng }
      : null;
  } catch {
    return null;
  }
}
