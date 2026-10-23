import { NextRequest, NextResponse } from "next/server";
import { placeDetails } from "@/lib/geocode";

// Public : coordonnées d'une suggestion Google choisie dans le formulaire.
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") ?? "").trim().slice(0, 300);
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  const place = await placeDetails(id);
  if (!place) return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
  return NextResponse.json(place);
}
