import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";

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
  if (role !== "admin" && role !== "secretaire") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { leadIds?: unknown[]; newStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)" },
      { status: 400 }
    );
  }

  const { leadIds, newStatus } = body;

  const validLeadIds = (Array.isArray(leadIds) ? leadIds : [])
    .map((id: unknown) => String(id ?? "").trim())
    .filter((id) => id.length > 0);

  const status = typeof newStatus === "string" ? newStatus.trim() : "";

  if (validLeadIds.length === 0) {
    return NextResponse.json(
      { error: "Aucun lead sélectionné" },
      { status: 400 }
    );
  }

  if (!status || !LEAD_STATUSES_ADMIN.includes(status as LeadStatus)) {
    return NextResponse.json(
      { error: "Statut invalide" },
      { status: 400 }
    );
  }

  const BATCH_SIZE = 50;
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    status,
    updated_at: now,
    status_changed_at: now,
  };
  if (status === "a_rappeler") {
    updates.callback_at = null;
  }

  for (let i = 0; i < validLeadIds.length; i += BATCH_SIZE) {
    const batch = validLeadIds.slice(i, i + BATCH_SIZE);
    const { data: leads } = await adminClient
      .from("leads")
      .select("id, status")
      .in("id", batch);

    const { error } = await adminClient
      .from("leads")
      .update(updates)
      .in("id", batch);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const logs = (leads || []).map((l) => ({
      lead_id: l.id,
      user_id: user.id,
      action: "Changement de statut (masse)",
      old_status: l.status ?? null,
      new_status: status,
    }));
    if (logs.length > 0) {
      await adminClient.from("lead_logs").insert(logs);
    }
  }

  return NextResponse.json({ success: true, count: validLeadIds.length });
}
