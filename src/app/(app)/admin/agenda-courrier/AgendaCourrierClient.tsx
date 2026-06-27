"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
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
import { formatTimeParis, formatDateParis, fromDatetimeLocalValueParis, toDatetimeLocalValueParis } from "@/lib/date";

interface CourrierEvent {
  id: string;
  type: "courrier";
  title: string;
  phone: string;
  callback_at: string;
  first_name: string;
  last_name: string;
  nrp_count: number;
  created_at: string;
  updated_at: string;
}

interface RappelEvent {
  id: string;
  type: "rappel";
  title: string;
  description: string | null;
  callback_at: string;
  created_at: string;
}

type CalendarEvent = CourrierEvent | RappelEvent;

interface AgendaCourrierClientProps {
  courrierEvents: CourrierEvent[];
  rappelEvents: RappelEvent[];
}

function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AgendaCourrierClient({ courrierEvents, rappelEvents }: AgendaCourrierClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCourrierModal, setShowCourrierModal] = useState<CourrierEvent | null>(null);
  const [showRappelModal, setShowRappelModal] = useState<RappelEvent | null>(null);
  const [showCreateRappel, setShowCreateRappel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [followUpAction, setFollowUpAction] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [newRappelName, setNewRappelName] = useState("");
  const [newRappelDesc, setNewRappelDesc] = useState("");
  const [newRappelDate, setNewRappelDate] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const allEvents: CalendarEvent[] = [...courrierEvents, ...rappelEvents];

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
    return allEvents.filter((e) => {
      const eventDate = new Date(e.callback_at);
      return isWithinInterval(eventDate, { start: dayStart, end: dayEnd });
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === "courrier") {
      setShowCourrierModal(event);
      setFollowUpAction("");
      setCallbackDate("");
    } else {
      setShowRappelModal(event);
    }
  };

  const handleFollowUp = async () => {
    if (!showCourrierModal || !followUpAction) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action: followUpAction };
      if (followUpAction === "a_rappeler" && callbackDate) {
        body.callback_at = fromDatetimeLocalValueParis(callbackDate);
      }
      await fetch(`/api/admin/code-courrier/${showCourrierModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setShowCourrierModal(null);
      setFollowUpAction("");
      setCallbackDate("");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRappel = async () => {
    if (!newRappelName.trim() || !newRappelDate) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/rappels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newRappelName.trim(),
          description: newRappelDesc.trim() || null,
          callback_at: fromDatetimeLocalValueParis(newRappelDate),
        }),
      });
      if (res.ok) {
        setShowCreateRappel(false);
        setNewRappelName("");
        setNewRappelDesc("");
        setNewRappelDate("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRappel = async () => {
    if (!showRappelModal) return;
    setActionLoading(true);
    try {
      await fetch(`/api/admin/rappels/${showRappelModal.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setShowRappelModal(null);
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
          <p className="text-slate-600 mt-1">Rappels des codes courrier et rappels personnels</p>
        </div>
        <button
          onClick={() => {
            setShowCreateRappel(true);
            setNewRappelDate(toDatetimeLocalValueParis(new Date().toISOString()));
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau rappel
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
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
              <div key={d} className="bg-slate-50 py-2 text-center text-sm font-medium text-slate-600">
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
                  className={`min-h-[100px] p-2 bg-white ${!isCurrentMonth ? "bg-slate-50/50" : ""}`}
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
                        onClick={() => handleEventClick(event)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors truncate ${
                          event.type === "courrier"
                            ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        }`}
                        title={event.type === "courrier" ? `${event.title} - ${(event as CourrierEvent).phone}` : event.title}
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

        {allEvents.length === 0 && (
          <div className="p-4 mx-4 mb-4 bg-slate-50 rounded-lg text-center text-slate-500">
            <p className="font-medium">Aucun rappel planifié</p>
            <p className="text-sm mt-1">
              Les rappels et codes courrier avec une date de rappel apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {/* Modal création rappel */}
      {showCreateRappel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Nouveau rappel</h3>
              <button
                onClick={() => { setShowCreateRappel(false); setNewRappelName(""); setNewRappelDesc(""); setNewRappelDate(""); }}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du rappel</label>
                <input
                  type="text"
                  value={newRappelName}
                  onChange={(e) => setNewRappelName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Appeler M. Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={newRappelDesc}
                  onChange={(e) => setNewRappelDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Description optionnelle..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date et heure du rappel</label>
                <input
                  type="datetime-local"
                  value={newRappelDate}
                  onChange={(e) => setNewRappelDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateRappel(false); setNewRappelName(""); setNewRappelDesc(""); setNewRappelDate(""); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateRappel}
                disabled={creating || !newRappelName.trim() || !newRappelDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {creating ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail code courrier */}
      {showCourrierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Code courrier</h3>
              <button
                onClick={() => { setShowCourrierModal(null); setFollowUpAction(""); setCallbackDate(""); }}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nom</p>
                  <p className="font-medium text-slate-800">{showCourrierModal.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prénom</p>
                  <p className="font-medium text-slate-800">{showCourrierModal.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Téléphone</p>
                  <p className="font-medium text-slate-800">{showCourrierModal.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date de création</p>
                  <p className="font-medium text-slate-800">{formatDateParis(showCourrierModal.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jours écoulés</p>
                  <p className="font-medium text-slate-800">{getDaysSinceCreation(showCourrierModal.created_at)} jour(s)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NRP</p>
                  <p className="font-medium text-slate-800">{showCourrierModal.nrp_count}</p>
                </div>
              </div>

              {showCourrierModal.callback_at && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Rappel prévu le {formatDateParis(showCourrierModal.callback_at)}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">Suivi</label>
                <select
                  value={followUpAction}
                  onChange={(e) => {
                    setFollowUpAction(e.target.value);
                    if (e.target.value === "a_rappeler") {
                      setCallbackDate(toDatetimeLocalValueParis(new Date().toISOString()));
                    } else {
                      setCallbackDate("");
                    }
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date et heure du rappel</label>
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
                onClick={() => { setShowCourrierModal(null); setFollowUpAction(""); setCallbackDate(""); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Fermer
              </button>
              <button
                onClick={handleFollowUp}
                disabled={actionLoading || !followUpAction || (followUpAction === "a_rappeler" && !callbackDate)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? "En cours..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail rappel libre */}
      {showRappelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Rappel</h3>
              <button onClick={() => setShowRappelModal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Nom</p>
                <p className="font-medium text-slate-800">{showRappelModal.title}</p>
              </div>
              {showRappelModal.description && (
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{showRappelModal.description}</p>
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  {formatDateParis(showRappelModal.callback_at)} à {formatTimeParis(showRappelModal.callback_at)}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between">
              <button
                onClick={handleDeleteRappel}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {actionLoading ? "Suppression..." : "Supprimer"}
              </button>
              <button
                onClick={() => setShowRappelModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
