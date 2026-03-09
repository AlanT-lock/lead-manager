import { createAdminClient } from "@/lib/supabase/admin";
import { CHANTIER_STATUS_FIELDS, DELEGATAIRE_GROUPS, INSTALLATION_TYPE_LABELS, INSTALLATION_TYPES, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { StatsFilters } from "./StatsFilters";
import { StatCard } from "./StatCard";
import { DelegataireRow } from "./DelegataireRow";
import { StatusRow } from "./StatusRow";

const STATUSES: LeadStatus[] = [
  "nouveau",
  "nrp",
  "a_rappeler",
  "en_attente_doc",
  "documents_recus",
  "incomplet",
  "bloque_mpr",
  "valide",
  "installe",
  "ancien_documents_recus",
  "annule",
];


export default async function AdminStatsPage({
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
  const baseInstalleUrl = `/admin/leads?status=installe&from=${from}&to=${to}${delegataireUrlPart ? `&${delegataireUrlPart}` : ""}`;
  const baseLeadsUrl = `/admin/leads?from=${from}&to=${to}${delegataireUrlPart ? `&${delegataireUrlPart}` : ""}`;

  let docRecusQuery = adminClient
    .from("leads")
    .select("benefit_cee, benefit_mpr, benefit_apporteur_affaires, installation_cost, material_cost, regie_cost, profitability, status, delegataire_group, installation_type, is_installe, is_depot_mpr, is_cee_paye, is_mpe_paye, is_code_envoye, is_depose, is_controle_veritas, is_paye, is_compte_bloque, is_rejete")
    .eq("status", "installe")
    .gte("updated_at", fromDate.toISOString())
    .lte("updated_at", toDate.toISOString());

  let allLeadsQuery = adminClient
    .from("leads")
    .select("status, installation_type")
    .gte("updated_at", fromDate.toISOString())
    .lte("updated_at", toDate.toISOString());

  if (selectedDelegataires.length > 0) {
    const orParts = selectedDelegataires.map((d) =>
      d === "__non_assigne__" ? "delegataire_group.is.null" : `delegataire_group.eq.${d}`
    );
    docRecusQuery = docRecusQuery.or(orParts.join(","));
    allLeadsQuery = allLeadsQuery.or(orParts.join(","));
  }

  const [
    { data: docRecusLeads },
    { data: allLeadsByStatus },
  ] = await Promise.all([
    docRecusQuery,
    allLeadsQuery,
  ]);

  const leads = docRecusLeads || [];
  const leadsDocRecusOnly = leads;
  const totalBenefitCee = leads.reduce((s, l) => s + (Number(l.benefit_cee) || 0), 0);
  const totalBenefitMpr = leads.reduce((s, l) => s + (Number(l.benefit_mpr) || 0), 0);
  const totalApporteurAffaires = leads.reduce((s, l) => s + (Number(l.benefit_apporteur_affaires) || 0), 0);
  const totalCosts = leads.reduce(
    (s, l) =>
      s +
      (Number(l.installation_cost) || 0) +
      (Number(l.material_cost) || 0) +
      (Number(l.regie_cost) || 0),
    0
  );
  const totalProfitability = leads.reduce((s, l) => s + (Number(l.profitability) || 0), 0);
  const count = leads.length;

  const delegataireCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const key = l.delegataire_group || "Non assigné";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = (allLeadsByStatus || []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const installationTypeCounts = (docRecusLeads || []).reduce<Record<string, number>>((acc, l) => {
    const key = l.installation_type || "non_renseigne";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const chantierCounts = CHANTIER_STATUS_FIELDS.reduce<Record<string, number>>((acc, { field }) => {
    acc[field] = leads.filter((l) => !!(l as Record<string, unknown>)[field]).length;
    return acc;
  }, {});

  const totalLeads = (allLeadsByStatus || []).length;
  const countDocRecusOnly = leadsDocRecusOnly.length;
  const totalProfitabilityDocRecus = leadsDocRecusOnly.reduce((s, l) => s + (Number(l.profitability) || 0), 0);
  const totalBenefitDocRecus = leadsDocRecusOnly.reduce((s, l) => s + (Number(l.benefit_cee) || 0) + (Number(l.benefit_mpr) || 0), 0);
  const avgProfitability = countDocRecusOnly > 0 ? totalProfitabilityDocRecus / countDocRecusOnly : 0;
  const avgBenefit = countDocRecusOnly > 0 ? totalBenefitDocRecus / countDocRecusOnly : 0;

  const benefitCeeNet = totalBenefitCee - totalCosts;

  const financialStats = [
    { label: "Total apporteur d'affaires", value: `${totalApporteurAffaires.toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Total bénéfices (CEE + MPR)", value: `${(totalBenefitCee + totalBenefitMpr).toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Bénéfice CEE (CEE - coûts)", value: `${benefitCeeNet.toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Bénéfice MPR", value: `${totalBenefitMpr.toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Total à payer (coûts)", value: `${totalCosts.toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Rentabilité totale", value: `${totalProfitability.toFixed(2)} €`, href: baseInstalleUrl, highlight: true },
    { label: "Rentabilité moyenne/dossier", value: `${avgProfitability.toFixed(2)} €`, href: baseInstalleUrl },
    { label: "Bénéfice moyen/dossier", value: `${avgBenefit.toFixed(2)} €`, href: baseInstalleUrl },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Statistiques</h1>
        <p className="text-slate-600 mt-1">
          Vue d&apos;ensemble des bénéfices et coûts. Cliquez sur une stat pour voir les dossiers.
        </p>
      </div>

      <StatsFilters />

      {selectedDelegataires.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          Filtre actif : <strong>{selectedDelegataires.map((d) => d === "__non_assigne__" ? "Non assigné" : d).join(", ")}</strong>
        </p>
      )}

      <div>
        <h2 className="font-medium text-slate-800 mb-3">Types d&apos;installation (installés)</h2>
        <p className="text-sm text-slate-500 mb-3">
          Nombre de dossiers par type d&apos;installation
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {INSTALLATION_TYPES.map((type) => (
            <StatCard
              key={type}
              label={INSTALLATION_TYPE_LABELS[type]}
              value={installationTypeCounts[type] ?? 0}
              href={baseInstalleUrl}
            />
          ))}
          <StatCard
            label="Non renseigné"
            value={installationTypeCounts["non_renseigne"] ?? 0}
            href={baseInstalleUrl}
          />
        </div>
      </div>

      <div>
        <h2 className="font-medium text-slate-800 mb-3">Indicateurs financiers (installés)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialStats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              href={stat.href}
              highlight={stat.highlight}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">Dossiers par mandataire (installés)</h2>
        <p className="text-sm text-slate-500 mb-4">Cliquez sur une ligne pour voir les dossiers filtrés</p>
        <div className="space-y-0">
          {DELEGATAIRE_GROUPS.map((d) => (
            <DelegataireRow
              key={d}
              label={d}
              count={delegataireCounts[d] ?? 0}
              href={`/admin/leads?status=installe&delegataire=${encodeURIComponent(d)}&from=${from}&to=${to}`}
            />
          ))}
          <DelegataireRow
            label="Non assigné"
            count={delegataireCounts["Non assigné"] ?? 0}
            href={`/admin/leads?status=installe&delegataire=__non_assigne__&from=${from}&to=${to}`}
            isLast
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">Dossiers par statut chantier (installés)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Nombre de dossiers ayant chaque statut (cumulables). Cliquez pour filtrer.
        </p>
        <div className="space-y-0">
          {CHANTIER_STATUS_FIELDS.map(({ field, label }, i) => (
            <StatusRow
              key={field}
              label={label}
              count={chantierCounts[field] ?? 0}
              href={`/admin/leads?status=installe&chantier=${field}&from=${from}&to=${to}`}
              isLast={i === CHANTIER_STATUS_FIELDS.length - 1}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium text-slate-800 mb-4">Leads par statut (tous types)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Total : {totalLeads} leads mis à jour dans la période. Cliquez pour filtrer.
        </p>
        <div className="space-y-0">
          {STATUSES.map((status, i) => (
            <StatusRow
              key={status}
              label={LEAD_STATUS_LABELS[status]}
              count={statusCounts[status] ?? 0}
              href={`${baseLeadsUrl}&status=${status}`}
              isLast={i === STATUSES.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
