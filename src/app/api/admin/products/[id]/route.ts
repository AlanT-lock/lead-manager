import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined && typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.price !== undefined) {
    const priceNum = typeof body.price === "number" ? body.price : parseFloat(body.price);
    if (!isNaN(priceNum) && priceNum >= 0) {
      updates.price = priceNum;
    }
  }
  if (body.product_type_id !== undefined && body.product_type_id) {
    updates.product_type_id = body.product_type_id;
  }
  if (body.quantity !== undefined) {
    const qty = typeof body.quantity === "number" ? body.quantity : parseInt(String(body.quantity), 10);
    if (!isNaN(qty) && qty >= 0) {
      updates.quantity = qty;
    }
  }
  if (body.color !== undefined) {
    updates.color = body.color || null;
  }
  if (body.supplier_id !== undefined) {
    updates.supplier_id = body.supplier_id || null;
  }
  if (body.display_order !== undefined) {
    const order = typeof body.display_order === "number" ? body.display_order : parseInt(String(body.display_order), 10);
    if (!isNaN(order) && order >= 0) {
      updates.display_order = order;
    }
  }

  const { data, error } = await adminClient
    .from("products")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      product_types (
        id,
        name,
        display_order
      ),
      suppliers (
        id,
        name
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  if (role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { error } = await adminClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
