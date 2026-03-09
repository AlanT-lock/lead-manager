import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin" && role !== "secretaire") return NextResponse.json([]);

  const now = new Date().toISOString();
  const { data } = await adminClient
    .from("rappels")
    .select("id, name, description, callback_at, created_at")
    .lte("callback_at", now)
    .order("callback_at", { ascending: false });

  return NextResponse.json(data || []);
}
