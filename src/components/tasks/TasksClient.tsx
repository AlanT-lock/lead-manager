"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Check,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import {
  formatFullDateTimeParis,
  fromDatetimeLocalValueParis,
  toDatetimeLocalValueParis,
} from "@/lib/date";
import {
  canDeleteTask,
  compareTasks,
  isReminderDue,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskPriority,
} from "@/lib/tasks";
import type { UserRole } from "@/lib/types";

export interface TaskPerson {
  id: string;
  name: string;
  role: string;
  active: boolean;
}

/** Événement émis après chaque modification, pour que les rappels se remettent à jour. */
export const TASKS_CHANGED_EVENT = "tasks:changed";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  secretaire: "Secrétaire",
  telepro: "Télépro",
  stockage: "Stockage",
};

export const PRIORITY_STYLES: Record<
  TaskPriority,
  { border: string; badge: string; header: string; dot: string; button: string }
> = {
  urgent: {
    border: "border-l-red-600",
    badge: "bg-red-100 text-red-700 border-red-200",
    header: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-600",
    button: "border-red-600 bg-red-600 text-white",
  },
  important: {
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    header: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
    button: "border-orange-500 bg-orange-500 text-white",
  },
};

const INPUT_CLS =
  "w-full px-3 py-2 text-sm border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40";
const LABEL_CLS = "block text-sm font-medium text-[#0b1f3a] mb-1";
const CARD_CLS =
  "rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)]";

type Scope = "received" | "sent" | "team";
type StatusView = "todo" | "done";

interface TasksClientProps {
  tasks: Task[];
  people: TaskPerson[];
  currentUserId: string;
  currentRole: UserRole | undefined;
  canSeeAll: boolean;
}

interface FormState {
  id: string | null;
  title: string;
  description: string;
  priority: TaskPriority;
  assignedTo: string;
  withReminder: boolean;
  remindAt: string;
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-[#e1e8f2] bg-white p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-[7px] transition-colors flex items-center gap-2 ${
            value === opt.value
              ? "bg-[#0b1f3a] text-white font-medium"
              : "text-[#64748b] hover:bg-[#f1f5f9]"
          }`}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span
              className={`text-xs tabular-nums px-1.5 rounded-full ${
                value === opt.value ? "bg-white/20" : "bg-[#f1f5f9]"
              }`}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function TasksClient({
  tasks,
  people,
  currentUserId,
  currentRole,
  canSeeAll,
}: TasksClientProps) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("received");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [statusView, setStatusView] = useState<StatusView>("todo");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Horloge locale : fait passer une tâche en « rappel dépassé » sans recharger.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const activePeople = useMemo(
    () =>
      people
        .filter((p) => p.active)
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [people]
  );

  const personName = (id: string | null) => {
    if (!id) return "Utilisateur supprimé";
    if (id === currentUserId) return "Moi";
    return peopleById.get(id)?.name ?? "Utilisateur supprimé";
  };

  const inScope = useMemo(() => {
    return tasks.filter((t) => {
      if (scope === "received") return t.assigned_to === currentUserId;
      if (scope === "sent") return t.created_by === currentUserId && t.assigned_to !== currentUserId;
      return personFilter === "all" || t.assigned_to === personFilter;
    });
  }, [tasks, scope, personFilter, currentUserId]);

  const todo = useMemo(
    () => inScope.filter((t) => !t.completed_at).sort((a, b) => compareTasks(a, b, now)),
    [inScope, now]
  );
  const done = useMemo(
    () =>
      inScope
        .filter((t) => t.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()),
    [inScope]
  );

  const receivedPendingCount = tasks.filter(
    (t) => t.assigned_to === currentUserId && !t.completed_at
  ).length;
  const sentPendingCount = tasks.filter(
    (t) => t.created_by === currentUserId && t.assigned_to !== currentUserId && !t.completed_at
  ).length;
  const teamPendingCount = tasks.filter((t) => !t.completed_at).length;

  const stats = {
    urgent: todo.filter((t) => t.priority === "urgent").length,
    important: todo.filter((t) => t.priority === "important").length,
    due: todo.filter((t) => isReminderDue(t, now)).length,
    done: done.length,
  };

  const notifyChanged = () => {
    window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
    router.refresh();
  };

  const openCreate = () => {
    setError(null);
    setForm({
      id: null,
      title: "",
      description: "",
      priority: "important",
      assignedTo: scope === "team" && personFilter !== "all" ? personFilter : currentUserId,
      withReminder: false,
      remindAt: toDatetimeLocalValueParis(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    });
  };

  const openEdit = (task: Task) => {
    setError(null);
    setForm({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      assignedTo: task.assigned_to,
      withReminder: !!task.remind_at,
      remindAt: task.remind_at
        ? toDatetimeLocalValueParis(task.remind_at)
        : toDatetimeLocalValueParis(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    });
  };

  const handleSave = async () => {
    if (!form || !form.title.trim()) return;
    if (form.withReminder && !form.remindAt) {
      setError("Choisissez une date et une heure pour le rappel.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(form.id ? `/api/tasks/${form.id}` : "/api/tasks", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          assigned_to: form.assignedTo,
          remind_at: form.withReminder ? fromDatetimeLocalValueParis(form.remindAt) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }
      setForm(null);
      notifyChanged();
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: Task, completed: boolean) => {
    setBusyId(task.id);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
      notifyChanged();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Supprimer la tâche « ${task.title} » ?`)) return;
    setBusyId(task.id);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE", credentials: "include" });
      notifyChanged();
    } finally {
      setBusyId(null);
    }
  };

  const scopeOptions: { value: Scope; label: string; count?: number }[] = [
    { value: "received", label: "Mes tâches", count: receivedPendingCount },
    { value: "sent", label: "Envoyées", count: sentPendingCount },
    ...(canSeeAll ? [{ value: "team" as Scope, label: "Toute l'équipe", count: teamPendingCount }] : []),
  ];

  const renderCard = (task: Task) => {
    const style = PRIORITY_STYLES[task.priority];
    const due = isReminderDue(task, now);
    const busy = busyId === task.id;
    const showAssignee = scope !== "received";
    const showCreator = task.created_by !== task.assigned_to;

    return (
      <div
        key={task.id}
        className={`${CARD_CLS} border-l-4 ${style.border} p-4 ${
          task.completed_at ? "opacity-75" : ""
        } ${due ? "ring-2 ring-red-200" : ""}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={`font-semibold text-[#0b1f3a] break-words ${
                  task.completed_at ? "line-through decoration-[#94a3b8]" : ""
                }`}
              >
                {task.title}
              </p>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${style.badge}`}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
              {due && (
                <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                  <BellRing className="w-3 h-3" />
                  Rappel dépassé
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-[#475569] mt-1 whitespace-pre-line break-words">
                {task.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#64748b]">
              {showAssignee && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  Pour : <span className="font-medium text-[#0b1f3a]">{personName(task.assigned_to)}</span>
                </span>
              )}
              {showCreator && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  De : <span className="font-medium text-[#0b1f3a]">{personName(task.created_by)}</span>
                </span>
              )}
              {task.remind_at && (
                <span
                  className={`flex items-center gap-1 ${
                    due ? "text-red-700 font-medium" : ""
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Rappel : {formatFullDateTimeParis(task.remind_at)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Ajoutée le {formatFullDateTimeParis(task.created_at)}
              </span>
              {task.completed_at && (
                <span className="flex items-center gap-1 text-emerald-700">
                  <Check className="w-3.5 h-3.5" />
                  Validée le {formatFullDateTimeParis(task.completed_at)}
                  {task.completed_by ? ` par ${personName(task.completed_by)}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!task.completed_at && (
              <button
                type="button"
                onClick={() => openEdit(task)}
                className="p-1.5 rounded-[7px] hover:bg-[#f1f5f9] text-[#64748b]"
                aria-label="Modifier"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDeleteTask(task, currentUserId, currentRole) && (
              <button
                type="button"
                onClick={() => handleDelete(task)}
                disabled={busy}
                className="p-1.5 rounded-[7px] hover:bg-red-50 text-[#64748b] hover:text-red-600 disabled:opacity-50"
                aria-label="Supprimer"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          {task.completed_at ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => toggleComplete(task, false)}
              className="gap-1 border-[#e1e8f2] text-[#64748b]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rouvrir
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => toggleComplete(task, true)}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check className="w-3.5 h-3.5" />
              Valider
            </Button>
          )}
        </div>
      </div>
    );
  };

  const emptyText =
    scope === "received"
      ? "Aucune tâche à faire. Bravo !"
      : scope === "sent"
        ? "Aucune tâche envoyée en attente."
        : "Aucune tâche en attente dans l'équipe.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tâches"
        subtitle="Créez des tâches pour vous ou pour un collègue, avec un rappel si besoin"
        actions={
          <Button onClick={openCreate} className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </Button>
        }
      />

      {/* Compteurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`${CARD_CLS} p-4 border-l-4 border-l-red-600`}>
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Urgentes</p>
          <p className="text-2xl font-bold text-[#0b1f3a] tabular-nums">{stats.urgent}</p>
        </div>
        <div className={`${CARD_CLS} p-4 border-l-4 border-l-orange-500`}>
          <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Importantes</p>
          <p className="text-2xl font-bold text-[#0b1f3a] tabular-nums">{stats.important}</p>
        </div>
        <div className={`${CARD_CLS} p-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-[#64748b] flex items-center gap-1">
            <BellRing className="w-3.5 h-3.5" /> Rappels dépassés
          </p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              stats.due > 0 ? "text-red-600" : "text-[#0b1f3a]"
            }`}
          >
            {stats.due}
          </p>
        </div>
        <div className={`${CARD_CLS} p-4`}>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Terminées</p>
          <p className="text-2xl font-bold text-[#0b1f3a] tabular-nums">{stats.done}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl value={scope} onChange={setScope} options={scopeOptions} />
          {scope === "team" && (
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
              aria-label="Filtrer par personne"
            >
              <option value="all">Tout le monde</option>
              {activePeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === currentUserId ? `${p.name} (moi)` : p.name}
                  {ROLE_LABELS[p.role] ? ` — ${ROLE_LABELS[p.role]}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <SegmentedControl
          value={statusView}
          onChange={setStatusView}
          options={[
            { value: "todo", label: "À faire", count: todo.length },
            { value: "done", label: "Terminées", count: done.length },
          ]}
        />
      </div>

      {statusView === "todo" ? (
        todo.length === 0 ? (
          <div className={`${CARD_CLS} p-8 text-center text-[#64748b]`}>
            <p className="font-medium">{emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {TASK_PRIORITIES.map((priority) => {
              const column = todo.filter((t) => t.priority === priority);
              const style = PRIORITY_STYLES[priority];
              return (
                <section key={priority} className="space-y-3">
                  <div
                    className={`flex items-center justify-between px-4 py-2 rounded-[10px] border ${style.header}`}
                  >
                    <h2 className="font-semibold flex items-center gap-2">
                      {priority === "urgent" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                      )}
                      {TASK_PRIORITY_LABELS[priority]}
                    </h2>
                    <span className="text-sm font-semibold tabular-nums">{column.length}</span>
                  </div>
                  {column.length === 0 ? (
                    <p className="text-sm text-[#94a3b8] px-4 py-6 text-center border border-dashed border-[#e1e8f2] rounded-[12px]">
                      Aucune tâche {priority === "urgent" ? "urgente" : "importante"}
                    </p>
                  ) : (
                    column.map(renderCard)
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : done.length === 0 ? (
        <div className={`${CARD_CLS} p-8 text-center text-[#64748b]`}>
          <p className="font-medium">Aucune tâche terminée.</p>
        </div>
      ) : (
        <div className="space-y-3">{done.map(renderCard)}</div>
      )}

      {/* Modal création / modification */}
      {form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_4px_24px_rgba(13,38,76,.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#e1e8f2]">
              <h3 className="text-lg font-semibold text-[#0b1f3a]">
                {form.id ? "Modifier la tâche" : "Nouvelle tâche"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="p-1 rounded-[9px] hover:bg-[#f1f5f9] text-[#64748b]"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={LABEL_CLS} htmlFor="task-title">
                  Titre
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={INPUT_CLS}
                  placeholder="Ex : Rappeler M. Dupont pour son devis"
                  autoFocus
                />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="task-description">
                  Description <span className="font-normal text-[#94a3b8]">(optionnelle)</span>
                </label>
                <textarea
                  id="task-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={`${INPUT_CLS} resize-none`}
                  placeholder="Détails, numéro de dossier…"
                />
              </div>
              <div>
                <span className={LABEL_CLS}>Importance</span>
                <div className="grid grid-cols-2 gap-2">
                  {TASK_PRIORITIES.map((priority) => {
                    const selected = form.priority === priority;
                    const style = PRIORITY_STYLES[priority];
                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setForm({ ...form, priority })}
                        aria-pressed={selected}
                        className={`px-3 py-2 text-sm font-medium rounded-[9px] border-2 transition-colors flex items-center justify-center gap-2 ${
                          selected ? style.button : `bg-white ${style.badge}`
                        }`}
                      >
                        {priority === "urgent" && <AlertTriangle className="w-4 h-4" />}
                        {TASK_PRIORITY_LABELS[priority]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="task-assignee">
                  Pour qui ?
                </label>
                <select
                  id="task-assignee"
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className={INPUT_CLS}
                >
                  <option value={currentUserId}>Moi-même</option>
                  {activePeople
                    .filter((p) => p.id !== currentUserId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {ROLE_LABELS[p.role] ? ` — ${ROLE_LABELS[p.role]}` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="rounded-[9px] border border-[#e1e8f2] p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[#0b1f3a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.withReminder}
                    onChange={(e) => setForm({ ...form, withReminder: e.target.checked })}
                    className="w-4 h-4 accent-[#2563eb]"
                  />
                  <Bell className="w-4 h-4 text-[#64748b]" />
                  Programmer un rappel
                </label>
                {form.withReminder && (
                  <>
                    <input
                      type="datetime-local"
                      value={form.remindAt}
                      onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
                      className={INPUT_CLS}
                      aria-label="Date et heure du rappel"
                    />
                    <p className="text-xs text-[#64748b]">
                      À cette heure-là, une notification s&apos;affichera chez le destinataire et
                      restera visible tant que la tâche n&apos;est pas validée.
                    </p>
                  </>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="p-4 border-t border-[#e1e8f2] flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setForm(null)}
                className="border-[#e1e8f2] text-[#64748b] hover:bg-[#f1f5f9]"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : form.id ? "Enregistrer" : "Créer la tâche"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
