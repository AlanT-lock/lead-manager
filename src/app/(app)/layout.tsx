import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Drawer } from "@/components/Drawer";
import { SaveOnLeaveProvider } from "@/contexts/SaveOnLeaveContext";
import { LEAD_STATUSES_ADMIN, LEAD_CATEGORIES } from "@/lib/types";

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

  const adminClient = createAdminClient();
  const isAdminOrSecretaire = role === "admin" || role === "secretaire";
  let statusCounts: Record<string, Record<string, number>> = {};
  try {
    const counts: Record<string, Record<string, number>> = {};
    for (const cat of LEAD_CATEGORIES) {
      counts[cat] = {};
      for (const s of LEAD_STATUSES_ADMIN) counts[cat][s] = 0;
    }
    // PostgREST limite chaque requête à 1000 lignes : on pagine pour compter
    // TOUS les leads (sinon les compteurs plafonnent à 1000).
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let rowsQuery = adminClient
        .from("leads")
        .select("status, category")
        .range(from, from + PAGE - 1);
      if (!isAdminOrSecretaire) {
        rowsQuery = rowsQuery.eq("assigned_to", user.id);
      }
      const { data: rows, error } = await rowsQuery;
      if (error || !rows || rows.length === 0) break;
      for (const row of rows) {
        const cat = row.category as string;
        const s = row.status as string;
        if (cat in counts && s in counts[cat]) counts[cat][s]++;
      }
      if (rows.length < PAGE) break;
    }
    statusCounts = counts;
  } catch {
    // Ignore errors, counts will be empty
  }

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
