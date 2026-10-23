import { NextRequest, NextResponse } from "next/server";
import { autocompleteAddress } from "@/lib/geocode";

// Public : utilisé par le formulaire client (sans session). Entrée bornée pour
// limiter l'usage abusif de la clé Google.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 150);
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  return NextResponse.json({ suggestions: await autocompleteAddress(q) });
}
