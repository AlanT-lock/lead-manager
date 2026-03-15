import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
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
  if (role !== "telepro") {
    return NextResponse.json({ error: "Réservé aux télépros" }, { status: 403 });
  }

  const { data: row } = await adminClient
    .from("telepro_pending_lead_opens")
    .select("lead_id")
    .eq("telepro_id", user.id)
    .single();

  if (!row) {
    return NextResponse.json({ leadId: null });
  }

  await adminClient
    .from("telepro_pending_lead_opens")
    .delete()
    .eq("telepro_id", user.id);

  return NextResponse.json({ leadId: row.lead_id });
}
