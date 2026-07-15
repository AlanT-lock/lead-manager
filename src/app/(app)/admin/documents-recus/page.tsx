import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsRecusFilters } from "./DocumentsRecusFilters";
import { DocumentsRecusTable } from "./DocumentsRecusTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { cookies } from "next/headers";
import { LeadsPagination } from "@/components/ui-kit/LeadsPagination";
import { PER_PAGE_COOKIE, fetchPaginatedLeads, parsePage, parsePerPage } from "@/lib/pagination";

import { CHANTIER_STATUS_FIELDS } from "@/lib/types";

const CHANTIER_FIELDS = CHANTIER_STATUS_FIELDS.map((f) => f.field);

export default async function AdminDocumentsRecusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; delegataire?: string | string[]; from?: string; to?: string; chantier?: string; page?: string; per?: string }>;
}) {
  const adminClient = createAdminClient();
  const params = await searchParams;
  const search = params.q;
  const delegataireParam = params.delegataire;
  const selectedDelegataires = Array.isArray(delegataireParam)
    ? delegataireParam
    : delegataireParam
      ? [delegataireParam]
      : [];
  const from = params.from;
  const to = params.to;
  const chantier = params.chantier;

  const cookieStore = await cookies();
  const per = params.per
    ? parsePerPage(params.per)
    : parsePerPage(cookieStore.get(PER_PAGE_COOKIE)?.value);
  const requestedPage = parsePage(params.page);

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const buildQuery = () => {
    let query = adminClient
      .from("leads")
      .select(
        `
      *,
      profile:profiles!assigned_to(full_name, email)
    `,
        { count: "exact" }
      )
      .eq("status", "documents_recus");

    if (fromDate) query = query.gte("updated_at", fromDate.toISOString());
    if (toDate) query = query.lte("updated_at", toDate.toISOString());

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term}`
      );
    }

    if (selectedDelegataires.length > 0) {
      const orParts = selectedDelegataires.map((d) =>
        d === "__non_assigne__" ? "delegataire_group.is.null" : `delegataire_group.eq.${d}`
      );
      query = query.or(orParts.join(","));
    }

    if (chantier && (CHANTIER_FIELDS as readonly string[]).includes(chantier)) {
      query = query.eq(chantier, true);
    }

    // `.order("id")` garantit un ordre total (cf. Task 4).
    return query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false });
  };

  const fetchPage = (target: number) =>
    buildQuery().range((target - 1) * per, target * per - 1);

  const { leads, page, total } = await fetchPaginatedLeads(fetchPage, requestedPage, per);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents reçus"
        subtitle="Leads avec statut Documents reçus — gestion des chantiers"
      />

      <DocumentsRecusFilters />

      <DocumentsRecusTable leads={leads} />

      <LeadsPagination page={page} per={per} total={total} />
    </div>
  );
}
