import type { UserRole } from "@/lib/types";

export type TaskPriority = "urgent" | "important";

export const TASK_PRIORITIES: TaskPriority[] = ["urgent", "important"];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  important: "Important",
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  remind_at: string | null;
  assigned_to: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export const TASK_COLUMNS =
  "id, title, description, priority, remind_at, assigned_to, created_by, created_at, completed_at, completed_by";

export function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "urgent" || value === "important";
}

/** Admin et secrétaire voient les tâches de tout le monde ; les autres seulement les leurs. */
export function canSeeAllTasks(role: UserRole | undefined): boolean {
  return role === "admin" || role === "secretaire";
}

/** Une tâche « est à moi » si je la reçois ou si je l'ai envoyée. */
export function isTaskVisibleTo(
  task: Pick<Task, "assigned_to" | "created_by">,
  userId: string,
  role: UserRole | undefined
): boolean {
  return canSeeAllTasks(role) || task.assigned_to === userId || task.created_by === userId;
}

/** Supprimer une tâche : réservé à son auteur, à l'admin et à la secrétaire. */
export function canDeleteTask(
  task: Pick<Task, "created_by">,
  userId: string,
  role: UserRole | undefined
): boolean {
  return canSeeAllTasks(role) || task.created_by === userId;
}

/** Le rappel est tombé et la tâche n'est toujours pas validée : la notif reste affichée. */
export function isReminderDue(task: Pick<Task, "remind_at" | "completed_at">, now: Date): boolean {
  if (task.completed_at || !task.remind_at) return false;
  return new Date(task.remind_at).getTime() <= now.getTime();
}

/**
 * Ordre d'affichage des tâches à faire : rappels dépassés d'abord, puis
 * rappels à venir (le plus proche en premier), puis tâches sans rappel
 * (la plus récente en premier).
 */
export function compareTasks(a: Task, b: Task, now: Date): number {
  const aDue = isReminderDue(a, now);
  const bDue = isReminderDue(b, now);
  if (aDue !== bDue) return aDue ? -1 : 1;
  if (a.remind_at && b.remind_at) {
    return new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime();
  }
  if (a.remind_at !== b.remind_at) return a.remind_at ? -1 : 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
