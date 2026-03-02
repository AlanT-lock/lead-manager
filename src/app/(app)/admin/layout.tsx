import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let profile: { role: string } | null = null;
  try {
    const adminClient = createAdminClient();
    const res = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = res.data;
  } catch {
    const res = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = res.data;
  }

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role === "telepro") {
    redirect("/telepro");
  }
  // admin et secretaire accèdent à l'espace admin

  return <>{children}</>;
}
