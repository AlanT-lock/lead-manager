import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeleproStatsClient } from "./TeleproStatsClient";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, INSTALLATION_TYPE_LABELS, INSTALLATION_TYPES } from "@/lib/types";
import { startOfMonth, endOfMonth } from "date-fns";
import { StatsTeleproDetailFilters } from "./StatsTeleproDetailFilters";

function getDateRange(from?: string, to?: string) {
  const now = new Date();
  const fromStr = from || toDateStr(startOfMonth(now));
  const toStr = to || toDateStr(endOfMonth(now));
  return { from: new Date(fromStr), to: new Date(toStr) };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function TeleproStatsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { from: fromDate, to: toDate } = getDateRange(sp.from, sp.to);
  toDate.setHours(23, 59, 59, 999);

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .eq("role", "telepro")
    .is("deleted_at", null)
    .single();

  if (!profile) notFound();

  const [
    { count: callsInPeriod },
    { data: leads },
    { data: docRecusLeads },
  ] = await Promise.all([
    adminClient
      .from("lead_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString()),
    adminClient
      .from("leads")
      .select("status")
      .eq("assigned_to", id)
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString()),
    adminClient
      .from("leads")
      .select("installation_type")
      .eq("assigned_to", id)
      .eq("status", "documents_recus")
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString()),
  ]);

  const statusCounts = (leads || []).reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  const installationCounts = (docRecusLeads || []).reduce<Record<string, number>>((acc, l) => {
    const key = l.installation_type || "non_renseigne";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalLeads = (leads || []).length;
  const totalWithInstallation = (docRecusLeads || []).length;

  const statusData = LEAD_STATUSES_ADMIN.map((s) => ({
    name: LEAD_STATUS_LABELS[s],
    value: statusCounts[s] ?? 0,
    status: s,
  })).filter((d) => d.value > 0);

  const installationData = [
    ...INSTALLATION_TYPES.map((t) => ({
      name: INSTALLATION_TYPE_LABELS[t],
      value: installationCounts[t] ?? 0,
      type: t,
    })),
    ...(installationCounts["non_renseigne"] ? [{ name: "Non renseigné", value: installationCounts["non_renseigne"], type: "non_renseigne" }] : []),
  ]
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      percent: totalWithInstallation > 0 ? Math.round((d.value / totalWithInstallation) * 100) : 0,
    }));

  const statusWithPercent = statusData.map((d) => ({
    ...d,
    percent: totalLeads > 0 ? Math.round((d.value / totalLeads) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {profile.full_name || profile.email}
          </h1>
          <p className="text-slate-600 text-sm">{profile.email}</p>
        </div>
      </div>

      <StatsTeleproDetailFilters />

      <TeleproStatsClient
        callsInPeriod={callsInPeriod ?? 0}
        statusData={statusWithPercent}
        installationData={installationData}
        totalLeads={totalLeads}
        totalWithInstallation={totalWithInstallation}
      />
    </div>
  );
}
