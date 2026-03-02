import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { supabase } = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Chemin requis" }, { status: 400 });
  }

  const leadId = path.split("/")[0];
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role?.toString().trim().toLowerCase();

  if (role === "admin" || role === "secretaire") {
    // Admin et secrétaire peuvent accéder à tous les documents
  } else if (role === "telepro") {
    const { data: lead } = await adminClient
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("assigned_to", user.id)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(path, 3600);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
