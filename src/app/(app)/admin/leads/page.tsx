import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CHANTIER_STATUS_FIELDS, type LeadStatus } from "@/lib/types";
import { AdminLeadsFilters } from "./AdminLeadsFilters";
import { AdminLeadsTable } from "./AdminLeadsTable";
import { DocumentsRecusTable } from "../documents-recus/DocumentsRecusTable";

const CHANTIER_FIELDS = CHANTIER_STATUS_FIELDS.map((f) => f.field);

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; telepro?: string; from?: string; to?: string; chantier?: string; delegataire?: string; installation_type?: string }>;
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

  // Parsing en heure locale pour éviter les décalages de fuseau
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  let query = adminClient
    .from("leads")
    .select(`
      *,
      profile:profiles!assigned_to(full_name, email)
    `)
    .order("created_at", { ascending: false });

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

  const [
    { data: leads },
    { data: allTelepros },
    { data: activeTelepros },
  ] = await Promise.all([
    query,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tous les leads</h1>
          <p className="text-slate-600 mt-1">
            Liste de tous les leads importés. Sélectionnez des leads pour les
            transférer ou les supprimer.
          </p>
        </div>
        <Link
          href="/admin/leads/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un lead
        </Link>
      </div>

      <AdminLeadsFilters telepros={teleprosForFilter} />

      {status === "documents_recus" ? (
        <DocumentsRecusTable leads={leads || []} />
      ) : (
        <AdminLeadsTable leads={leads || []} telepros={activeTelepros || []} />
      )}
    </div>
  );
}
