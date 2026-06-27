import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "agent-audio";
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4", "audio/x-m4a"];

export async function POST(
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

  if (profile?.role?.toString().trim().toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: telepro } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", teleproId)
    .single();

  if (!telepro || telepro.role?.toString().trim().toLowerCase() !== "telepro") {
    return NextResponse.json({ error: "Télépro non trouvé" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 400 });
  }
  const mime = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
  if (!ACCEPTED.includes(mime) && !["mp3", "wav", "m4a", "mp4"].includes(ext)) {
    return NextResponse.json(
      { error: "Format audio non accepté (MP3, WAV, M4A)" },
      { status: 400 }
    );
  }

  const path = `${teleproId}/message.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Erreur upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL manquant" },
      { status: 500 }
    );
  }
  const publicUrl = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;

  await adminClient
    .from("profiles")
    .update({ first_message_audio_url: publicUrl })
    .eq("id", teleproId);

  return NextResponse.json({ url: publicUrl });
}
