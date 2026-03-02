import { NextRequest, NextResponse } from "next/server";

/**
 * API de géocodage : code postal français → ville
 * Utilise l'API Geocoding de Google (à activer dans Google Cloud Console)
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code || code.length < 4) {
    return NextResponse.json(
      { error: "Code postal invalide" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Configuration manquante : GOOGLE_MAPS_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", `${code}, France`);
    url.searchParams.set("components", "country:FR");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("language", "fr");

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.error_message || "Erreur de géocodage" },
        { status: 502 }
      );
    }

    if (!data.results?.[0]) {
      return NextResponse.json({ city: null });
    }

    const result = data.results[0];
    const components = result.address_components || [];

    const getComponent = (types: string[]) =>
      components.find((c: { types: string[] }) =>
        types.some((t) => c.types.includes(t))
      )?.long_name;

    const city =
      getComponent(["locality"]) ??
      getComponent(["postal_town"]) ??
      getComponent(["sublocality", "sublocality_level_1"]) ??
      getComponent(["administrative_area_level_2"]) ??
      (() => {
        const addr = result.formatted_address || "";
        const match = addr.match(/^\d{5}\s+(.+?)(?:\s|,|$)/);
        return match ? match[1].trim() : null;
      })();

    return NextResponse.json({ city: city || null });
  } catch (err) {
    console.error("[geocode/postal-code]", err);
    return NextResponse.json(
      { error: "Erreur lors du géocodage" },
      { status: 500 }
    );
  }
}
