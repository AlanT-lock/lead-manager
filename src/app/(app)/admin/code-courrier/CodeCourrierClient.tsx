"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, X, Calendar as CalendarIcon } from "lucide-react";
import { formatDateParis, formatTimeParis, fromDatetimeLocalValueParis } from "@/lib/date";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addDays,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CodeCourrier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  nrp_count: number;
  callback_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CodeCourrierClientProps {
  codeCourriers: CodeCourrier[];
}

function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getDayCounterColor(days: number): string {
  if (days <= 0) return "rgb(34, 197, 94)";
  if (days >= 10) return "rgb(239, 68, 68)";
  const ratio = days / 10;
  const r = Math.round(34 + (239 - 34) * ratio);
  const g = Math.round(197 + (68 - 197) * ratio);
  const b = Math.round(94 + (68 - 94) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function isInRappel(cc: CodeCourrier): boolean {
  const days = getDaysSinceCreation(cc.created_at);
  return days >= 7 || cc.callback_at !== null;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CodeCourrierClient({ codeCourriers }: CodeCourrierClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<CodeCourrier | null>(null);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [followUpAction, setFollowUpAction] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  const rappels = useMemo(
    () => codeCourriers.filter((cc) => isInRappel(cc)),
    [codeCourriers]
  );

  const agendaEvents = useMemo(() => {
    return codeCourriers
      .filter((cc) => cc.callback_at !== null)
      .map((cc) => ({
        id: cc.id,
        title: `${cc.first_name} ${cc.last_name}`,
        phone: cc.phone,
        callback_at: cc.callback_at!,
        codeCourrier: cc,
      }));
  }, [codeCourriers]);

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/code-courrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFirstName("");
        setLastName("");
        setPhone("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce code courrier ?")) return;
    await fetch(`/api/admin/code-courrier/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    router.refresh();
  };

  const handleFollowUp = async () => {
    if (!showDetailModal || !followUpAction) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action: followUpAction };
      if (followUpAction === "a_rappeler" && callbackDate) {
        body.callback_at = fromDatetimeLocalValueParis(callbackDate);
      }
      await fetch(`/api/admin/code-courrier/${showDetailModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setShowDetailModal(null);
      setFollowUpAction("");
      setCallbackDate("");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (cc: CodeCourrier) => {
    setShowDetailModal(cc);
    setFollowUpAction("");
    setCallbackDate("");
  };

  // Agenda
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return agendaEvents.filter((e) => {
      const eventDate = new Date(e.callback_at);
      return isWithinInterval(eventDate, { start: dayStart, end: dayEnd });
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Code courrier</h1>
          <p className="text-slate-600 mt-1">
            Gestion des codes courrier et rappels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau code courrier
        </button>
      </div>

      {/* Rappels section */}
      {rappels.length > 0 && (
        <div className="relative">
          <div className="absolute -top-4 right-4 z-10">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-lg">
              <Image
                src="/code-courrier-avatar.png"
                alt="Avatar rappels"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-rose-900 mb-3">
              Rappels ({rappels.length})
            </h2>
            <div className="space-y-2">
              {rappels.map((cc) => {
                const days = getDaysSinceCreation(cc.created_at);
                return (
                  <div
                    key={cc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(cc)}
                    onKeyDown={(e) => e.key === "Enter" && openDetail(cc)}
                    className="flex items-center justify-between bg-white rounded-lg p-3 border border-rose-100 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-rose-900">
                        {cc.first_name} {cc.last_name}
                      </p>
                      <p className="text-sm text-rose-700">{cc.phone}</p>
                    </div>
                    <div className="text-sm text-rose-600">
                      {cc.callback_at
                        ? `Rappel : ${formatDateParis(cc.callback_at)}`
                        : `${days} jour(s) sans suivi`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Nom
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Prénom
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  N° de tél
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Date de création
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Jours
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  NRP / Rappel
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {codeCourriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Aucun code courrier
                  </td>
                </tr>
              ) : (
                codeCourriers.map((cc) => {
                  const dayCount = getDaysSinceCreation(cc.created_at);
                  const dayColor = getDayCounterColor(dayCount);
                  return (
                    <tr
                      key={cc.id}
                      onClick={() => openDetail(cc)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {cc.last_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {cc.first_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{cc.phone}</td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {formatDateParis(cc.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold"
                          style={{ backgroundColor: dayColor }}
                        >
                          {dayCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {cc.callback_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                            <CalendarIcon className="w-3 h-3" />
                            {formatDateParis(cc.callback_at)}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            {cc.nrp_count > 0 ? `${cc.nrp_count} NRP` : "—"}
                          </span>
                        )}
                      </td>
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agenda */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Agenda des rappels &mdash;{" "}
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-slate-50 py-2 text-center text-sm font-medium text-slate-600"
              >
                {d}
              </div>
            ))}
            {days.map((date) => {
              const dayEvents = getEventsForDay(date);
              const isCurrentMonth = isSameMonth(date, currentMonth);
              const isToday = isSameDay(date, new Date());

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[100px] p-2 bg-white ${
                    !isCurrentMonth ? "bg-slate-50/50" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday
                        ? "bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center"
                        : isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {format(date, "d")}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => openDetail(event.codeCourrier)}
                        className="w-full text-left px-2 py-1.5 rounded text-xs bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors truncate"
                        title={`${event.title} - ${event.phone}`}
                      >
                        <span className="font-medium block truncate">
                          {formatTimeParis(event.callback_at)} - {event.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {agendaEvents.length === 0 && (
          <div className="p-4 mx-4 mb-4 bg-slate-50 rounded-lg text-center text-slate-500">
            <p className="font-medium">Aucun rappel planifié</p>
            <p className="text-sm mt-1">
              Les codes courrier avec une date de rappel apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Nouveau code courrier
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de famille"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prénom
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  N° de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !firstName.trim() || !lastName.trim() || !phone.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {creating ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail / suivi */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Code courrier
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(null);
                  setFollowUpAction("");
                  setCallbackDate("");
                }}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nom</p>
                  <p className="font-medium text-slate-800">
                    {showDetailModal.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prénom</p>
                  <p className="font-medium text-slate-800">
                    {showDetailModal.first_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Téléphone</p>
                  <p className="font-medium text-slate-800">
                    {showDetailModal.phone}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date de création</p>
                  <p className="font-medium text-slate-800">
                    {formatDateParis(showDetailModal.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jours écoulés</p>
                  <p className="font-medium text-slate-800">
                    {getDaysSinceCreation(showDetailModal.created_at)} jour(s)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NRP</p>
                  <p className="font-medium text-slate-800">
                    {showDetailModal.nrp_count}
                  </p>
                </div>
              </div>

              {showDetailModal.callback_at && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Rappel prévu le {formatDateParis(showDetailModal.callback_at)}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suivi
                </label>
                <select
                  value={followUpAction}
                  onChange={(e) => {
                    setFollowUpAction(e.target.value);
                    if (e.target.value !== "a_rappeler") setCallbackDate("");
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une action...</option>
                  <option value="nrp">NRP</option>
                  <option value="a_rappeler">À rappeler</option>
                  <option value="annule">Annulé</option>
                </select>

                {followUpAction === "a_rappeler" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date et heure du rappel
                    </label>
                    <input
                      type="datetime-local"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(null);
                  setFollowUpAction("");
                  setCallbackDate("");
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Fermer
              </button>
              <button
                onClick={handleFollowUp}
                disabled={
                  actionLoading ||
                  !followUpAction ||
                  (followUpAction === "a_rappeler" && !callbackDate)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? "En cours..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
