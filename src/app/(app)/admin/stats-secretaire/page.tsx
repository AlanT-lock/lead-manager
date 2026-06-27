import { createAdminClient } from "@/lib/supabase/admin";
import { INSTALLATION_TYPE_LABELS, INSTALLATION_TYPES } from "@/lib/types";
import { StatsSecretaireFilters } from "./StatsSecretaireFilters";
import { StatCard } from "../stats/StatCard";

export default async function StatsSecretairePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; delegataire?: string | string[] }>;
}) {
  const adminClient = createAdminClient();
  const params = await searchParams;
  const from = params.from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = params.to || new Date().toISOString().slice(0, 10);
  const delegataireParam = params.delegataire;
  const selectedDelegataires = Array.isArray(delegataireParam)
    ? delegataireParam
    : delegataireParam
      ? [delegataireParam]
      : [];

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const delegataireUrlPart = selectedDelegataires.length > 0
    ? selectedDelegataires.map((d) => `delegataire=${encodeURIComponent(d)}`).join("&")
    : "";

  let docRecusQuery = adminClient
    .from("leads")
    .select("installation_type")
    .in("status", ["documents_recus", "ancien_documents_recus"])
    .gte("updated_at", fromDate.toISOString())
    .lte("updated_at", toDate.toISOString());

  if (selectedDelegataires.length > 0) {
    const orParts = selectedDelegataires.map((d) =>
      d === "__non_assigne__" ? "delegataire_group.is.null" : `delegataire_group.eq.${d}`
    );
    docRecusQuery = docRecusQuery.or(orParts.join(","));
  }

  const { data: docRecusLeads } = await docRecusQuery;

  const leads = docRecusLeads || [];
  const installationTypeCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.installation_type || "non_renseigne";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Statistiques</h1>
        <p className="text-slate-600 mt-1">
          Types d&apos;installation des dossiers documents reçus. Cliquez sur une stat pour voir les dossiers.
        </p>
      </div>

      <StatsSecretaireFilters />

      {selectedDelegataires.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          Filtre actif : <strong>{selectedDelegataires.map((d) => d === "__non_assigne__" ? "Non assigné" : d).join(", ")}</strong>
        </p>
      )}

      <div>
        <h2 className="font-medium text-slate-800 mb-3">Types d&apos;installation (documents reçus)</h2>
        <p className="text-sm text-slate-500 mb-3">
          Nombre de dossiers par type d&apos;installation
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {INSTALLATION_TYPES.map((type) => (
            <StatCard
              key={type}
              label={INSTALLATION_TYPE_LABELS[type]}
              value={installationTypeCounts[type] ?? 0}
              href={`/admin/documents-recus?from=${from}&to=${to}${delegataireUrlPart ? `&${delegataireUrlPart}` : ""}`}
            />
          ))}
          <StatCard
            label="Non renseigné"
            value={installationTypeCounts["non_renseigne"] ?? 0}
            href={`/admin/documents-recus?from=${from}&to=${to}${delegataireUrlPart ? `&${delegataireUrlPart}` : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
