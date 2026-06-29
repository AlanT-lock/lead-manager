import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LEAD_CATEGORIES, type LeadCategory } from "@/lib/types";
import { LeadsFilters } from "./LeadsFilters";
import { TeleproLeadsTable } from "./TeleproLeadsTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TeleproLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; category?: string }>;
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
  const category = params.category as LeadCategory | undefined;

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

  if (category && LEAD_CATEGORIES.includes(category)) {
    query = query.eq("category", category);
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
      <PageHeader
        title="Mes leads"
        subtitle="Liste de tous vos leads assignés"
        actions={
          <Link
            href="/telepro/leads/new"
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="w-4 h-4" />
            Ajouter un lead
          </Link>
        }
      />

      <LeadsFilters />

      <TeleproLeadsTable leads={leads || []} />
    </div>
  );
}
