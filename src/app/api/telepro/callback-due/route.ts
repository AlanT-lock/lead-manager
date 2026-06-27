import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { supabase } = await createClientFromRequest(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const adminClient = createAdminClient();

  const { data: leads } = await adminClient
    .from("leads")
    .select("id, first_name, last_name, phone, callback_at")
    .eq("assigned_to", user.id)
    .eq("status", "a_rappeler")
    .not("callback_at", "is", null)
    .lte("callback_at", now)
    .order("callback_at", { ascending: true });

  return NextResponse.json(leads || []);
}
