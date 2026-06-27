import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsRecusFilters } from "./DocumentsRecusFilters";
import { DocumentsRecusTable } from "./DocumentsRecusTable";

import { CHANTIER_STATUS_FIELDS } from "@/lib/types";

const CHANTIER_FIELDS = CHANTIER_STATUS_FIELDS.map((f) => f.field);

export default async function AdminDocumentsRecusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; delegataire?: string | string[]; from?: string; to?: string; chantier?: string }>;
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

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  let query = adminClient
    .from("leads")
    .select(`
      *,
      profile:profiles!assigned_to(full_name, email)
    `)
    .eq("status", "documents_recus")
    .order("updated_at", { ascending: false });

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

  const { data: leads } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Documents reçus
        </h1>
        <p className="text-slate-600 mt-1">
          Leads avec statut Documents reçus - gestion des chantiers
        </p>
      </div>

      <DocumentsRecusFilters />

      <DocumentsRecusTable leads={leads || []} />
    </div>
  );
}
