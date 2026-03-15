import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Appelle l'Edge Function vapi-setup-assistant pour créer ou mettre à jour
 * l'assistant Vapi du télépro (Server URL + serverMessages + firstMessage).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teleproId } = await params;
  const { supabase } = await createClientFromRequest(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const baseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "SUPABASE_URL non configuré (Edge Function indisponible)" },
      { status: 500 }
    );
  }
  const edgeUrl = `${baseUrl.replace(/\/$/, "")}/functions/v1/vapi-setup-assistant`;

  const res = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teleproId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error || "Erreur lors du setup de l'assistant" },
      { status: res.status >= 500 ? 502 : res.status }
    );
  }
  return NextResponse.json(data);
}
