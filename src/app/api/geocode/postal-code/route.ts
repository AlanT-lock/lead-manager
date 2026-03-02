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

    const components = data.results[0].address_components || [];
    const locality =
      components.find((c: { types: string[] }) =>
        c.types.includes("locality")
      )?.long_name ??
      components.find((c: { types: string[] }) =>
        c.types.includes("administrative_area_level_2")
      )?.long_name ??
      null;

    return NextResponse.json({ city: locality });
  } catch (err) {
    console.error("[geocode/postal-code]", err);
    return NextResponse.json(
      { error: "Erreur lors du géocodage" },
      { status: 500 }
    );
  }
}
