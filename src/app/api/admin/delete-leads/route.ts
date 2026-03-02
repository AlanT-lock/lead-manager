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

  let body: { leadIds?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)" },
      { status: 400 }
    );
  }

  const rawLeadIds = Array.isArray(body.leadIds) ? body.leadIds : [];
  const validLeadIds = rawLeadIds
    .map((id: unknown) => String(id ?? "").trim())
    .filter((id) => id.length > 0);

  if (validLeadIds.length === 0) {
    return NextResponse.json(
      { error: "Aucun lead sélectionné" },
      { status: 400 }
    );
  }

  // Récupérer les documents pour supprimer les fichiers du storage
  const { data: docs } = await adminClient
    .from("lead_documents")
    .select("storage_path")
    .in("lead_id", validLeadIds);

  const paths = (docs || []).map((d) => d.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await adminClient.storage.from("documents").remove(paths);
  }

  // Suppression des leads (CASCADE supprime lead_documents et lead_logs)
  const { error } = await adminClient
    .from("leads")
    .delete()
    .in("id", validLeadIds);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: validLeadIds.length });
}
