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
  if (role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { teleproId } = body;

  if (!teleproId) {
    return NextResponse.json(
      { error: "teleproId requis" },
      { status: 400 }
    );
  }

  const { data: telepro } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", teleproId)
    .single();

  if (!telepro || telepro.role !== "telepro") {
    return NextResponse.json(
      { error: "Télépro non trouvé" },
      { status: 404 }
    );
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", teleproId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: `/admin/redistribute?telepro=${teleproId}`,
  });
}
