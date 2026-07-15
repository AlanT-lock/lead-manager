import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { SaveOnLeaveProvider } from "@/contexts/SaveOnLeaveContext";
import { buildStatusCounts } from "@/lib/status-counts";

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

  const adminClient = createAdminClient();
  const isAdminOrSecretaire = role === "admin" || role === "secretaire";

  // Ces deux requêtes ne dépendent que de user.id / role : les enchaîner coûtait
  // un aller-retour pour rien.
  const [notifRes, countsRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    adminClient.rpc("lead_status_counts", {
      p_assigned_to: isAdminOrSecretaire ? null : user.id,
    }),
  ]);

  const count = notifRes.count;
  // Sur erreur RPC, retour sur compteurs vides plutôt qu'une page cassée.
  // Le Drawer étant défensif (statusCounts[cat] ?? {} et statusCounts[cat]?.[s] ?? 0),
  // il affiche les mêmes zéros que l'ancien repli d'erreur, sans interrompre l'app.
  const statusCounts = countsRes.error
    ? {}
    : buildStatusCounts(countsRes.data ?? []);

  return (
    <SaveOnLeaveProvider>
      <div className="min-h-screen flex">
        <Suspense fallback={<div className="hidden lg:block w-64 shrink-0 bg-gradient-to-b from-[#0b1f3a] to-[#13294b]" />}>
          <Drawer
            role={role === "admin" || role === "secretaire" ? (role as "admin" | "secretaire") : "telepro"}
            userName={profile?.full_name || user.email || undefined}
            unreadNotifications={count || 0}
            statusCounts={statusCounts}
          />
        </Suspense>
        <main className="flex-1 min-w-0 lg:ml-64 min-h-screen pt-4 pb-8 px-4 lg:px-8 bg-[#f4f7fb]">
          {children}
        </main>
      </div>
    </SaveOnLeaveProvider>
  );
}
