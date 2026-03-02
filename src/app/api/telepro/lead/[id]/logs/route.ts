import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase } = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: lead } = await adminClient
    .from("leads")
    .select("id")
    .eq("id", id)
    .eq("assigned_to", user.id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead non trouvé" }, { status: 404 });
  }

  const { data: logs } = await adminClient
    .from("lead_logs")
    .select(`
      id,
      action,
      old_status,
      new_status,
      created_at,
      profile:profiles!user_id(full_name)
    `)
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json(logs || []);
}
