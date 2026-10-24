import { redirect } from "next/navigation";
import { getTaskActor } from "@/lib/tasks-server";
import { canSeeAllTasks, TASK_COLUMNS, type Task } from "@/lib/tasks";
import { TasksClient, type TaskPerson } from "./TasksClient";

/** Nombre de tâches terminées chargées : l'historique complet n'a pas d'intérêt à l'écran. */
const COMPLETED_LIMIT = 300;

/** Page « Tâches », partagée entre /telepro/taches et /admin/taches. */
export async function TasksPage() {
  const actor = await getTaskActor();
  if (!actor) redirect("/login");
  const { userId, role, adminClient } = actor;
  const seeAll = canSeeAllTasks(role);

  const scoped = <T extends { or: (filter: string) => T }>(query: T) =>
    seeAll ? query : query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);

  const [{ data: profiles }, { data: pending }, { data: completed }] = await Promise.all([
    adminClient.from("profiles").select("id, full_name, email, role, deleted_at").order("full_name"),
    scoped(
      adminClient.from("tasks").select(TASK_COLUMNS).is("completed_at", null)
    ).order("created_at", { ascending: false }),
    scoped(
      adminClient.from("tasks").select(TASK_COLUMNS).not("completed_at", "is", null)
    )
      .order("completed_at", { ascending: false })
      .limit(COMPLETED_LIMIT),
  ]);

  const people: TaskPerson[] = (profiles || []).map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
    role: p.role?.toString().trim().toLowerCase() ?? "",
    active: !p.deleted_at,
  }));

  return (
    <TasksClient
      tasks={[...((pending || []) as Task[]), ...((completed || []) as Task[])]}
      people={people}
      currentUserId={userId}
      currentRole={role}
      canSeeAll={seeAll}
    />
  );
}
