import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import { LEAD_CATEGORIES, type LeadCategory } from "@/lib/types";
import { LeadsFilters } from "./LeadsFilters";
import { TeleproLeadsTable, type StatusSortDirection } from "./TeleproLeadsTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, fetchPaginatedLeads, parsePage, parsePerPage } from "@/lib/pagination";

export default async function TeleproLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string; category?: string; page?: string; per?: string; sort?: string; dir?: string }>;
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

  // L'URL prime sur le cookie ; le cookie prime sur le défaut.
  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);

  const statusSort: StatusSortDirection =
    params.sort === "status_changed_at" && (params.dir === "asc" || params.dir === "desc")
      ? params.dir
      : "none";

  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select("*", { count: "exact" })
      .eq("assigned_to", user.id);

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

    // `.order("id")` garantit un ordre total : sans lui, deux leads de même created_at
    // peuvent changer de place entre deux requêtes et donc apparaître deux fois ou être sautés.
    if (statusSort !== "none") {
      return query
        .order("status_changed_at", { ascending: statusSort === "asc", nullsFirst: false })
        .order("id", { ascending: false });
    }

    return query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  };

  const fetchPage = (target: number) =>
    buildQuery().range((target - 1) * per, target * per - 1);

  const { leads, page, total } = await fetchPaginatedLeads(fetchPage, requestedPage, per);

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

      <TeleproLeadsTable leads={leads} statusSort={statusSort} />

      <LeadsPagination page={page} per={per} total={total} />
    </div>
  );
}
