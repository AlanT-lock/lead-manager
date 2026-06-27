import { createAdminClient } from "@/lib/supabase/admin";
import { CreateLeadForm } from "./CreateLeadForm";

export default async function AdminNewLeadPage() {
  const adminClient = createAdminClient();
  const { data: telepros } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "telepro")
    .is("deleted_at", null)
    .order("full_name");

  return (
    <div className="space-y-6">
      <CreateLeadForm telepros={telepros || []} />
    </div>
  );
}
