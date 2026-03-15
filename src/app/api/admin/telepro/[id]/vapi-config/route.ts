import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teleproId } = await params;
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

  const { data: telepro, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", teleproId)
    .single();

  if (error || !telepro) {
    return NextResponse.json({ error: "Télépro non trouvé" }, { status: 404 });
  }

  const teleproRole = telepro.role?.toString().trim().toLowerCase();
  if (teleproRole !== "telepro") {
    return NextResponse.json({ error: "L'utilisateur n'est pas un télépro" }, { status: 400 });
  }

  return NextResponse.json({
    phone: telepro.phone ?? "",
    vapi_assistant_id: telepro.vapi_assistant_id ?? "",
    vapi_phone_number_id: telepro.vapi_phone_number_id ?? "",
    vapi_hold_message: telepro.vapi_hold_message ?? "",
    vapi_voice_id: telepro.vapi_voice_id ?? "",
    first_message_audio_url: telepro.first_message_audio_url ?? "",
    full_name: telepro.full_name,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teleproId } = await params;
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

  const { data: roleRow } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", teleproId)
    .single();

  if (!roleRow || roleRow.role?.toString().trim().toLowerCase() !== "telepro") {
    return NextResponse.json({ error: "Télépro non trouvé" }, { status: 404 });
  }

  const body = await request.json();
  const updates: {
    phone?: string | null;
    vapi_assistant_id?: string | null;
    vapi_phone_number_id?: string | null;
    vapi_hold_message?: string | null;
    vapi_voice_id?: string | null;
    first_message_audio_url?: string | null;
  } = {};

  if (typeof body.phone === "string") updates.phone = body.phone || null;
  if (typeof body.vapi_assistant_id === "string") updates.vapi_assistant_id = body.vapi_assistant_id || null;
  if (typeof body.vapi_phone_number_id === "string") updates.vapi_phone_number_id = body.vapi_phone_number_id || null;
  if (typeof body.vapi_hold_message === "string") updates.vapi_hold_message = body.vapi_hold_message || null;
  if (typeof body.vapi_voice_id === "string") updates.vapi_voice_id = body.vapi_voice_id || null;
  if (typeof body.first_message_audio_url === "string") updates.first_message_audio_url = body.first_message_audio_url || null;

  const { error } = await adminClient
    .from("profiles")
    .update(updates)
    .eq("id", teleproId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
