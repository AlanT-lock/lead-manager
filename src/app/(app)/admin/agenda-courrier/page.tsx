import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AgendaCourrierClient } from "./AgendaCourrierClient";

export default async function AgendaCourrierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "secretaire") redirect("/admin");

  const { data: codeCourriers } = await adminClient
    .from("code_courrier")
    .select("*")
    .not("callback_at", "is", null)
    .order("callback_at", { ascending: true });

  const events = (codeCourriers || []).map((cc) => ({
    id: cc.id,
    title: `${cc.first_name} ${cc.last_name}`,
    phone: cc.phone,
    callback_at: cc.callback_at!,
    first_name: cc.first_name,
    last_name: cc.last_name,
    nrp_count: cc.nrp_count,
    created_at: cc.created_at,
    updated_at: cc.updated_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
        <p className="text-slate-600 mt-1">
          Rappels des codes courrier
        </p>
      </div>

      <AgendaCourrierClient events={events} />
    </div>
  );
}
