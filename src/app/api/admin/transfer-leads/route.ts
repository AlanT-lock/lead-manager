import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
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
  if (role !== "admin" && role !== "secretaire") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { leadIds?: unknown[]; targetTeleproId?: string };
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)" },
      { status: 400 }
    );
  }

  const { leadIds, targetTeleproId } = body;

  const rawLeadIds = Array.isArray(leadIds) ? leadIds : [];
  const validLeadIds = rawLeadIds
    .map((id: unknown) => String(id ?? "").trim())
    .filter((id) => id.length > 0);

  const tid = typeof targetTeleproId === "string" ? targetTeleproId.trim() : "";

  if (validLeadIds.length === 0) {
    return NextResponse.json(
      { error: "Aucun lead sélectionné" },
      { status: 400 }
    );
  }

  if (!tid) {
    return NextResponse.json(
      { error: "Veuillez sélectionner un télépro cible" },
      { status: 400 }
    );
  }

  // Traiter par lots de 50 pour éviter les limites d'URL (Supabase/PostgREST)
  const BATCH_SIZE = 50;
  const now = new Date().toISOString();

  for (let i = 0; i < validLeadIds.length; i += BATCH_SIZE) {
    const batch = validLeadIds.slice(i, i + BATCH_SIZE);
    const { error } = await adminClient
      .from("leads")
      .update({
        assigned_to: tid,
        updated_at: now,
      })
      .in("id", batch);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  // Enregistrer les logs par lots
  const LOG_BATCH = 100;
  for (let i = 0; i < validLeadIds.length; i += LOG_BATCH) {
    const batch = validLeadIds.slice(i, i + LOG_BATCH);
    const logs = batch.map((leadId: string) => ({
      lead_id: leadId,
      user_id: user.id,
      action: "transfer",
      old_status: null,
      new_status: null,
    }));
    const { error: logError } = await adminClient.from("lead_logs").insert(logs);
    if (logError) {
      console.error("Erreur logs transfert:", logError);
    }
  }

  return NextResponse.json({ success: true, count: validLeadIds.length });
}
