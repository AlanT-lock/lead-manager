import { NextRequest, NextResponse } from "next/server";
import { createClientFromRequest } from "@/lib/supabase/route-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
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

  const { data, error } = await adminClient
    .from("products")
    .select(`
      *,
      product_types (
        id,
        name,
        display_order
      )
    `)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

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
  const { name, price, product_type_id, quantity } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  if (product_type_id == null || product_type_id === "") {
    return NextResponse.json({ error: "Le type de produit est requis" }, { status: 400 });
  }

  const priceNum = typeof price === "number" ? price : parseFloat(price);
  if (isNaN(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Le prix doit être un nombre positif" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("products")
    .insert({
      name: name.trim(),
      price: priceNum,
      product_type_id,
      quantity: typeof quantity === "number" ? Math.max(0, quantity) : 0,
      updated_at: new Date().toISOString(),
    })
    .select(`
      *,
      product_types (
        id,
        name,
        display_order
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
