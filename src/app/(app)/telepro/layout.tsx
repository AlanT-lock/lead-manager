import { getSessionProfile, getSessionUser } from "@/lib/supabase/session";
import { redirect } from "next/navigation";
import { CallbackNotifications } from "./teleprospection/CallbackNotifications";
import { TaskReminders } from "@/components/tasks/TaskReminders";
import { normalizeRole, roleLandingPath, usesAdminSpace } from "@/lib/roles";

export default async function TeleproLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/login");

  const profile = await getSessionProfile(user.id);

  const role = normalizeRole(profile?.role);
  if (usesAdminSpace(role)) {
    redirect(roleLandingPath(role));
  }

  return (
    <>
      <CallbackNotifications />
      <TaskReminders tasksHref="/telepro/taches" />
      {children}
    </>
  );
}
