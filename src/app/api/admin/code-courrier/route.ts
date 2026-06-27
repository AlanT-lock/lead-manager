import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin" && role !== "secretaire")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { first_name, last_name, phone, assigned_to } = body;

  if (!first_name || !last_name || !phone)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const MANUAL_TELEPROS: Record<string, string> = {
    __manual_roy: "Roy",
    __manual_noemie: "Noémie",
  };
  const isManual = assigned_to && assigned_to in MANUAL_TELEPROS;
  const manualName = isManual ? MANUAL_TELEPROS[assigned_to] : null;

  const insertData: Record<string, unknown> = {
    first_name,
    last_name,
    phone,
    assigned_to: isManual || !assigned_to ? null : assigned_to,
    assigned_to_manual: manualName || null,
  };

  const { data, error } = await adminClient.from("code_courrier").insert(insertData).select().single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
