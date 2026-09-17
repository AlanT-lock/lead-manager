import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CallbackNotifications } from "./teleprospection/CallbackNotifications";
import { normalizeRole, roleLandingPath, usesAdminSpace } from "@/lib/roles";

export default async function TeleproLayout({
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

  const role = normalizeRole(profile?.role);
  if (usesAdminSpace(role)) {
    redirect(roleLandingPath(role));
  }

  return (
    <>
      <CallbackNotifications />
      {children}
    </>
  );
}
