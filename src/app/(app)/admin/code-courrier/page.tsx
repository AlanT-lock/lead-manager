import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CodeCourrierClient } from "./CodeCourrierClient";

export default async function CodeCourrierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();

  const [
    { data: codeCourriers },
    { data: telepros },
  ] = await Promise.all([
    adminClient
      .from("code_courrier")
      .select(`
        *,
        profile:profiles!assigned_to(full_name, email)
      `)
      .order("created_at", { ascending: false }),
    adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "telepro")
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <CodeCourrierClient codeCourriers={codeCourriers || []} telepros={telepros || []} />
    </div>
  );
}
