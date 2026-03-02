import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_DOC_TYPES = ["devis", "facture", "facture_materiel", "facture_sous_traitant"] as const;
const TELEPRO_DOC_TYPES = ["taxe_fonciere", "avis_imposition"] as const;
const ALL_DOC_TYPES = [...ADMIN_DOC_TYPES, ...TELEPRO_DOC_TYPES] as const;

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/heic",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const leadId = formData.get("leadId") as string | null;
  const type = formData.get("type") as string | null;

  if (!file || !leadId || !type) {
    return NextResponse.json(
      { error: "Fichier, leadId et type requis" },
      { status: 400 }
    );
  }

  if (!ALL_DOC_TYPES.includes(type as (typeof ALL_DOC_TYPES)[number])) {
    return NextResponse.json(
      { error: "Type de document invalide" },
      { status: 400 }
    );
  }

  if (role === "admin" || role === "secretaire") {
    if (!ADMIN_DOC_TYPES.includes(type as (typeof ADMIN_DOC_TYPES)[number])) {
      return NextResponse.json(
        { error: "Type de document invalide pour l'admin" },
        { status: 400 }
      );
    }
  } else if (role === "telepro") {
    if (!TELEPRO_DOC_TYPES.includes(type as (typeof TELEPRO_DOC_TYPES)[number])) {
      return NextResponse.json(
        { error: "Seuls taxe foncière et avis d'imposition sont autorisés" },
        { status: 403 }
      );
    }
    const { data: lead } = await adminClient
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("assigned_to", user.id)
      .single();
    if (!lead) {
      return NextResponse.json(
        { error: "Lead non trouvé ou non assigné" },
        { status: 403 }
      );
    }
  } else {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const validExts = ["pdf", "jpeg", "jpg", "heic", "png", "webp"];
  const mime = file.type?.toLowerCase();
  const isValidMime = mime && ACCEPTED_MIME_TYPES.includes(mime);
  const isValidExt = ext && validExts.includes(ext);
  if (!isValidMime && !isValidExt) {
    return NextResponse.json(
      { error: "Format non autorisé (PDF, JPEG, JPG, HEIC, PNG, WebP)" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Le fichier dépasse 5 Mo" },
      { status: 400 }
    );
  }

  const path = `${leadId}/${type}/${Date.now()}_${file.name}`;

  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await adminClient.storage
    .from("documents")
    .upload(path, buffer, {
      contentType: file.type || "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Erreur upload: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("lead_documents")
    .insert({
      lead_id: leadId,
      type,
      file_name: file.name,
      storage_path: path,
      file_size: file.size,
      uploaded_by: user.id,
    })
    .select("id, type, file_name, storage_path, created_at")
    .single();

  if (insertError) {
    await adminClient.storage.from("documents").remove([path]);
    return NextResponse.json(
      { error: `Erreur base de données: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, document: inserted });
}
