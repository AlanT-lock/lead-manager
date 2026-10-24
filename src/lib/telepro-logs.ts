import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Historique visible par un télépro : après une redistribution, le lead doit lui
 * paraître neuf, donc on masque tout ce qui précède la dernière redistribution
 * (y compris le log « redistribution » lui-même, créé au même instant).
 * L'admin, lui, lit lead_logs sans ce filtre.
 */
export async function fetchTeleproLeadLogs(adminClient: SupabaseClient, leadId: string) {
  const { data: lastDistribution } = await adminClient
    .from("lead_distributions")
    .select("created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let query = adminClient
    .from("lead_logs")
    .select(`
      *,
      profile:profiles!user_id(full_name)
    `)
    .eq("lead_id", leadId);

  if (lastDistribution?.created_at) {
    query = query.gt("created_at", lastDistribution.created_at);
  }

  return query.order("created_at", { ascending: false }).limit(20);
}
