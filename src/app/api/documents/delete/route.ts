import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

const TELEPRO_DOC_TYPES = ["taxe_fonciere", "avis_imposition"];

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

  const body = await request.json();
  const { id, storagePath } = body;

  if (!id || !storagePath) {
    return NextResponse.json(
      { error: "id et storagePath requis" },
      { status: 400 }
    );
  }

  if (role === "telepro") {
    const { data: doc } = await adminClient
      .from("lead_documents")
      .select("lead_id, type")
      .eq("id", id)
      .single();
    if (!doc || !TELEPRO_DOC_TYPES.includes(doc.type)) {
      return NextResponse.json({ error: "Document non supprimable" }, { status: 403 });
    }
    const { data: lead } = await adminClient
      .from("leads")
      .select("id")
      .eq("id", doc.lead_id)
      .eq("assigned_to", user.id)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (role !== "admin" && role !== "secretaire") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await adminClient.storage.from("documents").remove([storagePath]);
  await adminClient.from("lead_documents").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
