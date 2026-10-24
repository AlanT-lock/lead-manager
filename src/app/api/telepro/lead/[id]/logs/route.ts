import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserFromClient } from "@/lib/supabase/session";
import { fetchTeleproLeadLogs } from "@/lib/telepro-logs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase } = await createClientFromRequest(request);
  const user = await getUserFromClient(supabase);

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

  const { data: logs } = await fetchTeleproLeadLogs(adminClient, id);

  return NextResponse.json(logs || []);
}
