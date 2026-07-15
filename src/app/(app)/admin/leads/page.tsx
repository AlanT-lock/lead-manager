import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CHANTIER_STATUS_FIELDS, LEAD_CATEGORIES, type LeadCategory, type LeadStatus } from "@/lib/types";
import { AdminLeadsFilters } from "./AdminLeadsFilters";
import { AdminLeadsTable } from "./AdminLeadsTable";
import { DocumentsRecusTable } from "../documents-recus/DocumentsRecusTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cookies } from "next/headers";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, fetchPaginatedLeads, parsePage, parsePerPage } from "@/lib/pagination";

const CHANTIER_FIELDS = CHANTIER_STATUS_FIELDS.map((f) => f.field);

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; telepro?: string; from?: string; to?: string; chantier?: string; delegataire?: string; installation_type?: string; category?: string; page?: string; per?: string; sort?: string; dir?: string }>;
}) {
  const adminClient = createAdminClient();
  const params = await searchParams;
  const status = params.status as LeadStatus | undefined;
  const search = params.q;
  const assignedTo = params.telepro;
  const from = params.from;
  const to = params.to;
  const chantier = params.chantier;
  const delegataire = params.delegataire;
  const installationType = params.installation_type;
  const category = params.category as LeadCategory | undefined;

  // L'URL prime sur le cookie ; le cookie prime sur le défaut.
  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);

  const statusSort = params.sort === "status_changed_at" && (params.dir === "asc" || params.dir === "desc")
    ? params.dir
    : "none";

  // Parsing en heure locale pour éviter les décalages de fuseau
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select(
        `
      *,
      profile:profiles!assigned_to(full_name, email)
    `,
        { count: "exact" }
      );

    if (fromDate) query = query.gte("created_at", fromDate.toISOString());
    if (toDate) query = query.lte("created_at", toDate.toISOString());

    if (chantier && (CHANTIER_FIELDS as readonly string[]).includes(chantier)) {
      query = query.eq("status", status ?? "documents_recus").eq(chantier, true);
    } else if (status) {
      query = query.eq("status", status);
    }

    if (installationType) {
      if (installationType === "non_renseigne") {
        query = query.is("installation_type", null);
      } else {
        query = query.eq("installation_type", installationType);
      }
    }

    if (category && LEAD_CATEGORIES.includes(category)) {
      query = query.eq("category", category);
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    if (delegataire) {
      if (delegataire === "__non_assigne__") {
        query = query.is("delegataire_group", null);
      } else {
        query = query.eq("delegataire_group", delegataire);
      }
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

  const [{ leads, page, total }, { data: allTelepros }, { data: activeTelepros }] = await Promise.all([
    fetchPaginatedLeads(fetchPage, requestedPage, per),
    adminClient
      .from("profiles")
      .select("id, full_name, email, deleted_at")
      .eq("role", "telepro")
      .order("full_name"),
    adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "telepro")
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  const teleprosForFilter = (allTelepros || []).map((t) => ({
    ...t,
    label: t.deleted_at
      ? `${t.full_name || t.email} (supprimé)`
      : t.full_name || t.email,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tous les leads"
        subtitle="Liste de tous les leads importés. Sélectionnez des leads pour les transférer ou les supprimer."
        actions={
          <Link
            href="/admin/leads/new"
            className={cn(buttonVariants(), "gap-2")}
          >
            <Plus className="w-4 h-4" />
            Ajouter un lead
          </Link>
        }
      />

      <AdminLeadsFilters telepros={teleprosForFilter} />

      {status === "documents_recus" ? (
        <DocumentsRecusTable leads={leads} />
      ) : (
        <AdminLeadsTable leads={leads} telepros={activeTelepros || []} statusSort={statusSort} />
      )}

      <LeadsPagination page={page} per={per} total={total} />
    </div>
  );
}
