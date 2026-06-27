import { createAdminClient } from "@/lib/supabase/admin";
import { TeleproCardWithCharts } from "./TeleproCardWithCharts";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUSES_ADMIN,
  INSTALLATION_TYPE_LABELS,
  INSTALLATION_TYPES,
} from "@/lib/types";
import { StatsTeleproFilters } from "./StatsTeleproFilters";
import { startOfMonth, endOfMonth } from "date-fns";

function getDateRange(from?: string, to?: string) {
  const now = new Date();
  const fromStr = from || toDateStr(startOfMonth(now));
  const toStr = to || toDateStr(endOfMonth(now));
  return { from: new Date(fromStr), to: new Date(toStr) };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from: fromDate, to: toDate } = getDateRange(params.from, params.to);
  toDate.setHours(23, 59, 59, 999);

  const adminClient = createAdminClient();

  const { data: telepros } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "telepro")
    .is("deleted_at", null)
    .order("full_name");

  const activeTelepros = telepros || [];
  const teleproIds = activeTelepros.map((t) => t.id);

  let leadsByTelepro: Record<string, { status: string }[]> = {};
  let docRecusByTelepro: Record<string, { installation_type: string | null }[]> =
    {};
  let callsByTelepro: Record<string, number> = {};

  if (teleproIds.length > 0) {
    const [leadsRes, docRecusRes, logsRes] = await Promise.all([
      adminClient
        .from("leads")
        .select("assigned_to, status")
        .in("assigned_to", teleproIds)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString()),
      adminClient
        .from("leads")
        .select("assigned_to, installation_type")
        .in("assigned_to", teleproIds)
        .eq("status", "documents_recus")
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString()),
      adminClient
        .from("lead_logs")
        .select("user_id")
        .in("user_id", teleproIds)
        .gte("created_at", fromDate.toISOString())
        .lte("created_at", toDate.toISOString()),
    ]);

    const leads = leadsRes.data || [];
    const docRecus = docRecusRes.data || [];
    const logs = logsRes.data || [];

    callsByTelepro = teleproIds.reduce<Record<string, number>>((acc, t) => {
      acc[t] = logs.filter((l) => l.user_id === t).length;
      return acc;
    }, {});

    for (const t of teleproIds) {
      leadsByTelepro[t] = leads.filter((l) => l.assigned_to === t);
      docRecusByTelepro[t] = docRecus.filter((l) => l.assigned_to === t);
    }
  }

  const teleprosWithStats = activeTelepros.map((telepro) => {
    const leads = leadsByTelepro[telepro.id] || [];
    const docRecus = docRecusByTelepro[telepro.id] || [];

    const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {});

    const installationCounts = docRecus.reduce<Record<string, number>>(
      (acc, l) => {
        const key = l.installation_type || "non_renseigne";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );

    const totalLeads = leads.length;
    const totalWithInstallation = docRecus.length;

    const statusData = LEAD_STATUSES_ADMIN.map((s) => ({
      name: LEAD_STATUS_LABELS[s],
      value: statusCounts[s] ?? 0,
      status: s,
    }))
      .filter((d) => d.value > 0)
      .map((d) => ({
        ...d,
        percent: totalLeads > 0 ? Math.round((d.value / totalLeads) * 100) : 0,
      }));

    const installationData = [
      ...INSTALLATION_TYPES.map((t) => ({
        name: INSTALLATION_TYPE_LABELS[t],
        value: installationCounts[t] ?? 0,
        type: t,
      })),
      ...(installationCounts["non_renseigne"]
        ? [
            {
              name: "Non renseigné",
              value: installationCounts["non_renseigne"],
              type: "non_renseigne",
            },
          ]
        : []),
    ]
      .filter((d) => d.value > 0)
      .map((d) => ({
        name: d.name,
        value: d.value,
        type: d.type,
        percent:
          totalWithInstallation > 0
            ? Math.round((d.value / totalWithInstallation) * 100)
            : 0,
      }));

    return {
      ...telepro,
      callsCount: callsByTelepro[telepro.id] ?? 0,
      statusData,
      installationData,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-600 mt-1">
          Consultez les statistiques détaillées de chaque télépro
        </p>
      </div>

      <StatsTeleproFilters />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teleprosWithStats.map((telepro) => (
          <TeleproCardWithCharts
            key={telepro.id}
            id={telepro.id}
            fullName={telepro.full_name}
            email={telepro.email}
            callsCount={telepro.callsCount ?? 0}
            statusData={telepro.statusData}
            installationData={telepro.installationData}
            dateFrom={params.from}
            dateTo={params.to}
          />
        ))}
      </div>

      {activeTelepros.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-slate-600">Aucun télépro actif</p>
        </div>
      )}
    </div>
  );
}
