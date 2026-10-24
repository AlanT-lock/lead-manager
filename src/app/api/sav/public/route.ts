import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSavFromFormData } from "@/lib/sav-server";

// Formulaire client : volontairement sans authentification (demande du client).
export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  // Champ piège invisible pour les humains : un robot qui le remplit est ignoré
  // en silence (réponse « succès » pour ne pas l'informer).
  if (formData.get("website")) return NextResponse.json({ ok: true });

  const result = await createSavFromFormData(createAdminClient(), formData, { source: "client" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
