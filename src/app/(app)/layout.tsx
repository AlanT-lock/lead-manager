import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Drawer } from "@/components/Drawer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let profile: { full_name: string | null; role: string; deleted_at: string | null } | null = null;
  try {
    const adminClient = createAdminClient();
    const res = await adminClient
      .from("profiles")
      .select("full_name, role, deleted_at")
      .eq("id", user.id)
      .single();
    profile = res.data;
  } catch {
    const res = await supabase
      .from("profiles")
      .select("full_name, role, deleted_at")
      .eq("id", user.id)
      .single();
    profile = res.data;
  }

  if (profile?.deleted_at) {
    const supabaseSignOut = await createClient();
    await supabaseSignOut.auth.signOut();
    redirect("/login?message=Compte désactivé");
  }

  const role = profile?.role?.toString().trim().toLowerCase() as "admin" | "telepro" | "secretaire" | undefined;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return (
    <div className="min-h-screen flex">
      <Drawer
        role={role === "admin" || role === "secretaire" ? (role as "admin" | "secretaire") : "telepro"}
        userName={profile?.full_name || user.email || undefined}
        unreadNotifications={count || 0}
      />
      <main className="flex-1 lg:ml-64 min-h-screen pt-4 pb-8 px-4 lg:px-8">
        {children}
      </main>
    </div>
  );
}
