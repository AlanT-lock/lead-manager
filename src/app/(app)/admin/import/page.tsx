import { createAdminClient } from "@/lib/supabase/admin";
import { CsvImportForm } from "./CsvImportForm";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

export default async function AdminImportPage() {
  const adminClient = createAdminClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const [
    { count: today },
    { count: week },
    { count: month },
    { data: telepros },
  ] = await Promise.all([
    adminClient
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("imported_at", todayStart.toISOString()),
    adminClient
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("imported_at", weekStart.toISOString()),
    adminClient
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("imported_at", monthStart.toISOString()),
    adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "telepro")
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  const stats = [
    { label: "Importés aujourd'hui", value: today || 0 },
    { label: "Importés cette semaine", value: week || 0 },
    { label: "Importés ce mois", value: month || 0 },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import CSV</h1>
        <p className="text-slate-600 mt-1">
          Importez des leads depuis un fichier CSV.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <CsvImportForm telepros={telepros || []} />
    </div>
  );
}
