import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { TeleprospectionClient } from "./TeleprospectionClient";

export default async function TeleprospectionPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; done?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const params = await searchParams;
  const leadId = params.lead;
  const isDone = params.done === "1";

  const now = new Date().toISOString();

  // Ordre : 1) Rappels dus (priorité), 2) Nouveau, 3) NRP, 4) En attente doc. Jamais : annulé, documents reçus.
  const [callbackDue, nouveau, nrp, enAttenteDoc] = await Promise.all([
    adminClient
      .from("leads")
      .select("id")
      .eq("assigned_to", user.id)
      .eq("status", "a_rappeler")
      .not("callback_at", "is", null)
      .lte("callback_at", now)
      .order("callback_at", { ascending: true }),
    adminClient
      .from("leads")
      .select("id")
      .eq("assigned_to", user.id)
      .eq("status", "nouveau")
      .order("created_at", { ascending: false }),
    adminClient
      .from("leads")
      .select("id")
      .eq("assigned_to", user.id)
      .eq("status", "nrp")
      .order("created_at", { ascending: false }),
    adminClient
      .from("leads")
      .select("id")
      .eq("assigned_to", user.id)
      .eq("status", "en_attente_doc")
      .order("created_at", { ascending: false }),
  ]);

  const leadIds: string[] = [
    ...(callbackDue.data?.map((l) => l.id) || []),
    ...(nouveau.data?.map((l) => l.id) || []),
    ...(nrp.data?.map((l) => l.id) || []),
    ...(enAttenteDoc.data?.map((l) => l.id) || []),
  ];

  let initialLeadId: string | null = null;
  if (isDone) {
    initialLeadId = null;
  } else {
    initialLeadId = leadId || leadIds[0] || null;
  }

  return (
    <TeleprospectionClient
      initialLeadId={initialLeadId || null}
      leadIds={leadIds}
    />
  );
}
