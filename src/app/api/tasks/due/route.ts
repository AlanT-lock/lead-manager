import { NextResponse } from "next/server";
import { getTaskActor } from "@/lib/tasks-server";

/**
 * Tâches non validées avec rappel, reçues par l'utilisateur, dont le rappel
 * tombe dans les prochaines 24 h ou est déjà passé. Le client programme
 * lui-même l'affichage à l'heure exacte : pas besoin de poller à la minute.
 */
export async function GET() {
  const actor = await getTaskActor();
  if (!actor) return NextResponse.json([], { status: 401 });
  const { userId, adminClient } = actor;

  const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data } = await adminClient
    .from("tasks")
    .select("id, title, description, priority, remind_at, completed_at, created_by")
    .eq("assigned_to", userId)
    .is("completed_at", null)
    .not("remind_at", "is", null)
    .lte("remind_at", horizon)
    .order("remind_at", { ascending: true });

  const tasks = data || [];
  const creatorIds = [...new Set(tasks.map((t) => t.created_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", creatorIds);
    for (const p of profiles || []) names.set(p.id, p.full_name || p.email);
  }

  return NextResponse.json(
    tasks.map((t) => ({
      ...t,
      created_by_name: t.created_by && t.created_by !== userId ? names.get(t.created_by) ?? null : null,
    }))
  );
}
