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

  const { data: codeCourriers } = await adminClient
    .from("code_courrier")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <CodeCourrierClient codeCourriers={codeCourriers || []} />
    </div>
  );
}
