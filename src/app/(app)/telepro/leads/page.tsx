import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LeadsFilters } from "./LeadsFilters";
import { TeleproLeadsTable } from "./TeleproLeadsTable";

export default async function TeleproLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  const params = await searchParams;
  const status = params.status as string | undefined;
  const search = params.q;
  const from = params.from;
  const to = params.to;

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  let query = adminClient
    .from("leads")
    .select("*")
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (toDate) query = query.lte("created_at", toDate.toISOString());

  if (status) {
    query = query.eq("status", status);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`
    );
  }

  const { data: leads } = await query;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mes leads</h1>
          <p className="text-slate-600 mt-1">
            Liste de tous vos leads assignés
          </p>
        </div>
        <Link
          href="/telepro/leads/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un lead
        </Link>
      </div>

      <LeadsFilters />

      <TeleproLeadsTable leads={leads || []} />
    </div>
  );
}
