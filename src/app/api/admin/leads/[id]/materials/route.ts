import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const { supabase } = await createClientFromRequest(_request);
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

  const { data, error } = await adminClient
    .from("lead_materials")
    .select(`
      id,
      product_id,
      quantity,
      products (
        id,
        name,
        price,
        product_types (
          id,
          name
        )
      )
    `)
    .eq("lead_id", leadId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
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
  const materials = Array.isArray(body.materials) ? body.materials : [];

  // Supprimer les anciennes entrées
  await adminClient
    .from("lead_materials")
    .delete()
    .eq("lead_id", leadId);

  if (materials.length > 0) {
    const toInsert = materials
      .filter((m: { product_id: string; quantity?: number }) => m.product_id)
      .map((m: { product_id: string; quantity?: number }) => ({
        lead_id: leadId,
        product_id: m.product_id,
        quantity: Math.max(1, m.quantity ?? 1),
      }));

    const { error: insertError } = await adminClient
      .from("lead_materials")
      .insert(toInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data } = await adminClient
    .from("lead_materials")
    .select(`
      id,
      product_id,
      quantity,
      products (
        id,
        name,
        price,
        product_types (
          id,
          name
        )
      )
    `)
    .eq("lead_id", leadId);

  return NextResponse.json(data || []);
}
