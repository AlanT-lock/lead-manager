import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * NRP utilise maintenant Twilio (plus Vapi).
 * Cette route est conservée pour compatibilité UI mais ne configure plus Vapi.
 * Voir docs/CONFIG_TWILIO_NRP.md pour la config Twilio.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teleproId } = await params;
  const { supabase } = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: telepro } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", teleproId)
    .single();

  if (!telepro) {
    return NextResponse.json({ error: "Télépro non trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    message: "NRP utilise Twilio. Configurez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (secrets) et par télépro : profiles.phone + profiles.twilio_phone_number (E.164). Voir docs/CONFIG_TWILIO_NRP.md",
  });
}
