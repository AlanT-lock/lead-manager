import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminLeadsTable } from "../leads/AdminLeadsTable";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { ChevronLeft } from "lucide-react";

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
        className="inline-flex items-center gap-1 text-sm text-[#2563eb] hover:text-[#1d4ed8] font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour aux utilisateurs
      </Link>

      <PageHeader
        title="Redistribuer les leads"
        subtitle={`Leads de ${teleproName} à redistribuer. Sélectionnez les leads et transférez-les vers un autre télépro.`}
      />

      <div className="rounded-[12px] border border-amber-200 bg-amber-50 shadow-[0_1px_2px_rgba(13,38,76,.06)] p-4">
        <p className="text-amber-800 text-sm font-medium">
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
