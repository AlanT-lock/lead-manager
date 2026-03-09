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

  const [{ data: codeCourriers }, { data: rappels }] = await Promise.all([
    adminClient
      .from("code_courrier")
      .select("*")
      .not("callback_at", "is", null)
      .order("callback_at", { ascending: true }),
    adminClient
      .from("rappels")
      .select("*")
      .order("callback_at", { ascending: true }),
  ]);

  const courrierEvents = (codeCourriers || []).map((cc) => ({
    id: cc.id,
    type: "courrier" as const,
    title: `${cc.first_name} ${cc.last_name}`,
    phone: cc.phone,
    callback_at: cc.callback_at!,
    first_name: cc.first_name,
    last_name: cc.last_name,
    nrp_count: cc.nrp_count,
    created_at: cc.created_at,
    updated_at: cc.updated_at,
  }));

  const rappelEvents = (rappels || []).map((r) => ({
    id: r.id,
    type: "rappel" as const,
    title: r.name,
    description: r.description as string | null,
    callback_at: r.callback_at,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-6">
      <AgendaCourrierClient courrierEvents={courrierEvents} rappelEvents={rappelEvents} />
    </div>
  );
}
