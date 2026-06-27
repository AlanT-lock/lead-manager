import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Route de debug - affiche le profil de l'utilisateur connecté.
 * À supprimer en production.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
  });
}
