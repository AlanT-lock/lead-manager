import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { TeleprospectionClient } from "./TeleprospectionClient";

export default async function TeleprospectionPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const params = await searchParams;
  const leadId = params.lead;

  let initialLeadId = leadId;
  let leadIds: string[] = [];

  if (!leadId) {
    const now = new Date().toISOString();
    const { data: callbackLeads } = await adminClient
      .from("leads")
      .select("id")
      .eq("assigned_to", user.id)
      .eq("status", "a_rappeler")
      .lte("callback_at", now)
      .order("callback_at", { ascending: true })
      .limit(1);

    if (callbackLeads?.length) {
      initialLeadId = callbackLeads[0].id;
    } else {
      const statusOrder = ["nouveau", "nrp", "en_attente_doc"];
      for (const status of statusOrder) {
        const { data } = await adminClient
          .from("leads")
          .select("id")
          .eq("assigned_to", user.id)
          .eq("status", status)
          .neq("status", "documents_recus")
          .neq("status", "annule")
          .order("created_at", { ascending: false }); // Dernier arrivé, premier affiché
        if (data?.length) {
          initialLeadId = initialLeadId || data[0].id;
          break;
        }
      }
    }
  }

  const { data: allLeads } = await adminClient
    .from("leads")
    .select("id")
    .eq("assigned_to", user.id)
    .in("status", ["nouveau", "nrp", "a_rappeler", "en_attente_doc"])
    .order("created_at", { ascending: false }); // Dernier arrivé, premier affiché

  leadIds = allLeads?.map((l) => l.id) || [];

  return (
    <TeleprospectionClient
      initialLeadId={initialLeadId || null}
      leadIds={leadIds}
    />
  );
}
