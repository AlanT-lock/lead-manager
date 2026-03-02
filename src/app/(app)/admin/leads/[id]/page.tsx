import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminLeadForm } from "./AdminLeadForm";
import { DocumentsSection } from "./DocumentsSection";
import { LeadLogsSidebar } from "@/components/LeadLogsSidebar";

export default async function AdminLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: lead } = await adminClient
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const { data: logs } = await adminClient
    .from("lead_logs")
    .select(`
      *,
      profile:profiles!user_id(full_name)
    `)
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: documents } = await adminClient
    .from("lead_documents")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const logEntries = (logs || []).map((log) => ({
    id: log.id,
    action: log.action,
    old_status: log.old_status,
    new_status: log.new_status,
    created_at: log.created_at,
    profile: log.profile,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/leads"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Retour aux leads
      </Link>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h1 className="text-xl font-bold text-slate-800 mb-6">
              {lead.first_name} {lead.last_name}
              {lead.is_duplicate && (
                <span className="ml-2 text-sm font-normal text-amber-600">
                  (Doublon)
                </span>
              )}
            </h1>

            <AdminLeadForm lead={lead} />
            <DocumentsSection leadId={id} documents={documents || []} />
          </div>
        </div>
        <LeadLogsSidebar logs={logEntries} />
      </div>
    </div>
  );
}
