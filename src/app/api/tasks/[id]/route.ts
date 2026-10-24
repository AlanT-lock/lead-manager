import { NextRequest, NextResponse } from "next/server";
import { getTaskActor } from "@/lib/tasks-server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { canDeleteTask, isTaskPriority, isTaskVisibleTo, TASK_COLUMNS } from "@/lib/tasks";

async function loadTask(adminClient: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await adminClient
    .from("tasks")
    .select("id, assigned_to, created_by")
    .eq("id", id)
    .single();
  return data;
}

/**
 * Valider / rouvrir une tâche, ou modifier son contenu (titre, description,
 * importance, rappel, destinataire). Ouvert à quiconque voit la tâche.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getTaskActor();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { userId, role, adminClient } = actor;
  const { id } = await params;

  const task = await loadTask(adminClient, id);
  if (!task || !isTaskVisibleTo(task, userId, role))
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.completed === "boolean") {
    update.completed_at = body.completed ? new Date().toISOString() : null;
    update.completed_by = body.completed ? userId : null;
  }
  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    update.title = title;
  }
  if ("description" in body) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    update.description = description || null;
  }
  if ("priority" in body) {
    if (!isTaskPriority(body.priority))
      return NextResponse.json({ error: "Niveau d'importance invalide" }, { status: 400 });
    update.priority = body.priority;
  }
  if ("remind_at" in body) {
    const remindAt = body.remind_at ? new Date(body.remind_at) : null;
    if (remindAt && Number.isNaN(remindAt.getTime()))
      return NextResponse.json({ error: "Date de rappel invalide" }, { status: 400 });
    update.remind_at = remindAt ? remindAt.toISOString() : null;
  }
  if ("assigned_to" in body && body.assigned_to !== task.assigned_to) {
    const { data: assignee } = await adminClient
      .from("profiles")
      .select("id, deleted_at")
      .eq("id", body.assigned_to)
      .single();
    if (!assignee || assignee.deleted_at)
      return NextResponse.json({ error: "Destinataire introuvable" }, { status: 400 });
    update.assigned_to = assignee.id;
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Rien à modifier" }, { status: 400 });

  const { data, error } = await adminClient
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select(TASK_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getTaskActor();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { userId, role, adminClient } = actor;
  const { id } = await params;

  const task = await loadTask(adminClient, id);
  if (!task || !isTaskVisibleTo(task, userId, role))
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  if (!canDeleteTask(task, userId, role))
    return NextResponse.json({ error: "Seul l'auteur de la tâche peut la supprimer" }, { status: 403 });

  const { error } = await adminClient.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
