import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { TeleproLeadForm } from "../TeleproLeadForm";
import { LeadLogsSidebar } from "@/components/LeadLogsSidebar";

export default async function TeleproLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();

  const { data: lead } = await adminClient
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("assigned_to", user.id)
    .single();

  if (!lead) notFound();

  const { data: teleproDocs } = await adminClient
    .from("lead_documents")
    .select("id, type, file_name, storage_path, created_at")
    .eq("lead_id", id)
    .in("type", ["taxe_fonciere", "avis_imposition"]);

  const { data: logs } = await adminClient
    .from("lead_logs")
    .select(`
      *,
      profile:profiles!user_id(full_name)
    `)
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

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
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <TeleproLeadForm
            lead={lead}
            leadId={id}
            teleproDocuments={teleproDocs || []}
            showBackToLeads
            showTeleprospectionLink
          />
        </div>
        <LeadLogsSidebar logs={logEntries} />
      </div>
    </div>
  );
}
