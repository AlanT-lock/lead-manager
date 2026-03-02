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
  if (role !== "admin" && role !== "secretaire") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const {
    first_name,
    last_name,
    phone,
    email,
    assigned_to,
    address,
    postal_code,
    city,
    surface_m2,
    revenu_fiscal_ref,
    numero_fiscal,
    date_of_birth,
    heating_mode,
    radiator_type,
    color,
    is_owner,
    installation_type,
    electricity_type,
    commentaire,
  } = body;

  if (!first_name?.trim() || !last_name?.trim() || !phone?.trim()) {
    return NextResponse.json(
      { error: "Prénom, nom et téléphone sont requis" },
      { status: 400 }
    );
  }

  if (!assigned_to) {
    return NextResponse.json(
      { error: "Un télépro doit être assigné" },
      { status: 400 }
    );
  }

  const leadData = {
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: String(phone).trim(),
    email: email ? String(email).trim() || null : null,
    assigned_to,
    status: "nouveau",
    address: address ? String(address).trim() || null : null,
    postal_code: postal_code ? String(postal_code).trim() || null : null,
    city: city ? String(city).trim() || null : null,
    surface_m2: surface_m2 != null ? Number(surface_m2) : null,
    revenu_fiscal_ref: revenu_fiscal_ref != null ? Number(revenu_fiscal_ref) : null,
    numero_fiscal: numero_fiscal ? String(numero_fiscal).trim() || null : null,
    date_of_birth: date_of_birth ? String(date_of_birth).trim() || null : null,
    heating_mode: heating_mode || null,
    radiator_type: Array.isArray(radiator_type) && radiator_type.length > 0 ? radiator_type : null,
    color: color || null,
    is_owner: is_owner === true || is_owner === "owner" ? true : is_owner === false || is_owner === "tenant" ? false : null,
    installation_type: installation_type || null,
    electricity_type: electricity_type || null,
    commentaire: commentaire ? String(commentaire).trim() || null : null,
  };

  const { data: lead, error } = await adminClient
    .from("leads")
    .insert(leadData)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminClient.from("lead_logs").insert({
    lead_id: lead.id,
    user_id: user.id,
    action: "Création manuelle",
    old_status: null,
    new_status: "nouveau",
  });

  return NextResponse.json({ id: lead.id });
}
