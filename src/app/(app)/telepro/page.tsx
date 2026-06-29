import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";
import Link from "next/link";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { NrpCallsButton } from "./NrpCallsButton";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { StatCard } from "@/components/ui-kit/StatCard";

export default async function TeleproDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const { count: total } = await adminClient
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id);

  const { count: today } = await adminClient
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id)
    .gte("imported_at", todayStart.toISOString());

  const { count: week } = await adminClient
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id)
    .gte("imported_at", weekStart.toISOString());

  const { count: month } = await adminClient
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("assigned_to", user.id)
    .gte("imported_at", monthStart.toISOString());

  const { data: byStatus } = await adminClient
    .from("leads")
    .select("status")
    .eq("assigned_to", user.id);

  const statusCounts = (byStatus || []).reduce(
    (acc, l) => {
      acc[l.status as LeadStatus] = (acc[l.status as LeadStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LeadStatus, number>
  );

  const documentsRecus =
    (statusCounts.documents_recus || 0) +
    (statusCounts.ancien_documents_recus || 0);
  const conversionRate =
    (total || 0) > 0
      ? ((documentsRecus / (total || 1)) * 100).toFixed(1)
      : "0";

  const stats = [
    { label: "Leads totaux", value: total || 0 },
    { label: "Reçus ce mois", value: month || 0 },
    { label: "Reçus cette semaine", value: week || 0 },
    { label: "Reçus aujourd'hui", value: today || 0 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos leads"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-6 shadow-[0_1px_2px_rgba(13,38,76,.06)]">
          <h2 className="font-medium text-[#0b1f3a] mb-4">Leads par statut</h2>
          <div className="space-y-2">
            {(
              [
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
              ] as LeadStatus[]
            ).map((s) => (
              <div
                key={s}
                className="flex justify-between text-sm"
              >
                <span className="text-[#64748b]">{LEAD_STATUS_LABELS[s]}</span>
                <span className="font-medium text-[#0b1f3a]">{statusCounts[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-6 shadow-[0_1px_2px_rgba(13,38,76,.06)]">
          <h2 className="font-medium text-[#0b1f3a] mb-4">Taux de conversion</h2>
          <p className="text-3xl font-bold text-emerald-600">
            {conversionRate} %
          </p>
          <p className="text-sm text-[#64748b] mt-1">
            Leads &quot;Documents reçus&quot; + &quot;Ancien documents reçus&quot; / Total
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <NrpCallsButton />
        <Link
          href="/telepro/leads"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voir mes leads
        </Link>
        <Link
          href="/telepro/teleprospection"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0b1f3a] text-white font-medium rounded-lg hover:opacity-90 transition-colors"
        >
          Démarrer la téléprospection
        </Link>
      </div>
    </div>
  );
}
