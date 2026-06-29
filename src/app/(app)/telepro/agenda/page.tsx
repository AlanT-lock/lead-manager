import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AgendaClient } from "./AgendaClient";
import { PageHeader } from "@/components/ui-kit/PageHeader";

export default async function TeleproAgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: callbacks } = await adminClient
    .from("leads")
    .select("id, first_name, last_name, phone, callback_at")
    .eq("assigned_to", user.id)
    .eq("status", "a_rappeler")
    .not("callback_at", "is", null)
    .order("callback_at", { ascending: true });

  const events = (callbacks || []).map((l) => ({
    id: l.id,
    title: `${l.first_name} ${l.last_name}`,
    phone: l.phone,
    callback_at: l.callback_at!,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agenda"
        subtitle="Visualisez vos rappels à effectuer"
      />

      <AgendaClient events={events} />
    </div>
  );
}
