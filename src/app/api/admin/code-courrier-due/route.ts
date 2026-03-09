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
  if (role !== "secretaire") return NextResponse.json([]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [{ data: oldEntries }, { data: callbackDue }] = await Promise.all([
    adminClient
      .from("code_courrier")
      .select("id, first_name, last_name, phone, created_at, callback_at")
      .lte("created_at", sevenDaysAgo)
      .is("callback_at", null),
    adminClient
      .from("code_courrier")
      .select("id, first_name, last_name, phone, created_at, callback_at")
      .not("callback_at", "is", null)
      .lte("callback_at", now),
  ]);

  const allIds = new Set<string>();
  const results: typeof oldEntries = [];
  for (const entry of [...(oldEntries || []), ...(callbackDue || [])]) {
    if (!allIds.has(entry.id)) {
      allIds.add(entry.id);
      results.push(entry);
    }
  }

  return NextResponse.json(results);
}
