import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLeadsTable } from "../leads/AdminLeadsTable";

export default async function AdminRedistributePage({
  searchParams,
}: {
  searchParams: Promise<{ telepro?: string }>;
}) {
  const params = await searchParams;
  const teleproId = params.telepro;

  if (!teleproId) {
    redirect("/admin/leads");
  }

  const adminClient = createAdminClient();

  const { data: telepro } = await adminClient
    .from("profiles")
    .select("id, full_name, email, deleted_at")
    .eq("id", teleproId)
    .single();

  if (!telepro) {
    redirect("/admin/leads");
  }

  const { data: leads } = await adminClient
    .from("leads")
    .select(`
      *,
      profile:profiles!assigned_to(full_name, email)
    `)
    .eq("assigned_to", teleproId)
    .order("created_at", { ascending: false });

  const { data: activeTelepros } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "telepro")
    .is("deleted_at", null)
    .order("full_name");

  const teleproName = telepro.full_name || telepro.email;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Retour aux utilisateurs
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Redistribuer les leads
        </h1>
        <p className="text-slate-600 mt-1">
          Leads de <strong>{teleproName}</strong> à redistribuer. Sélectionnez
          les leads et transférez-les vers un autre télépro.
        </p>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-amber-800 text-sm">
          {leads?.length || 0} lead(s) à redistribuer
        </p>
      </div>

      <AdminLeadsTable
        leads={leads || []}
        telepros={activeTelepros || []}
        excludeTeleproId={teleproId}
      />
    </div>
  );
}
