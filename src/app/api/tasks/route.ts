import { NextRequest, NextResponse } from "next/server";
import { getTaskActor } from "@/lib/tasks-server";
import { isTaskPriority, TASK_COLUMNS } from "@/lib/tasks";

export async function POST(req: NextRequest) {
  const actor = await getTaskActor();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { userId, adminClient } = actor;

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const assignedTo = typeof body.assigned_to === "string" && body.assigned_to ? body.assigned_to : userId;
  const remindAt = body.remind_at ? new Date(body.remind_at) : null;

  if (!title) return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
  if (!isTaskPriority(body.priority))
    return NextResponse.json({ error: "Niveau d'importance invalide" }, { status: 400 });
  if (remindAt && Number.isNaN(remindAt.getTime()))
    return NextResponse.json({ error: "Date de rappel invalide" }, { status: 400 });

  const { data: assignee } = await adminClient
    .from("profiles")
    .select("id, deleted_at")
    .eq("id", assignedTo)
    .single();
  if (!assignee || assignee.deleted_at)
    return NextResponse.json({ error: "Destinataire introuvable" }, { status: 400 });

  const { data, error } = await adminClient
    .from("tasks")
    .insert({
      title,
      description: description || null,
      priority: body.priority,
      remind_at: remindAt ? remindAt.toISOString() : null,
      assigned_to: assignedTo,
      created_by: userId,
    })
    .select(TASK_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
