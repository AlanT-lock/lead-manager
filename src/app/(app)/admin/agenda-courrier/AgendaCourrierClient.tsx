"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Calendar as CalendarIcon } from "lucide-react";
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
import { formatTimeParis, formatDateParis, fromDatetimeLocalValueParis } from "@/lib/date";

interface AgendaEvent {
  id: string;
  title: string;
  phone: string;
  callback_at: string;
  first_name: string;
  last_name: string;
  nrp_count: number;
  created_at: string;
  updated_at: string;
}

interface AgendaCourrierClientProps {
  events: AgendaEvent[];
}

function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AgendaCourrierClient({ events }: AgendaCourrierClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDetailModal, setShowDetailModal] = useState<AgendaEvent | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [followUpAction, setFollowUpAction] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const router = useRouter();

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
    return events.filter((e) => {
      const eventDate = new Date(e.callback_at);
      return isWithinInterval(eventDate, { start: dayStart, end: dayEnd });
    });
  };

  const openDetail = (event: AgendaEvent) => {
    setShowDetailModal(event);
    setFollowUpAction("");
    setCallbackDate("");
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

  return (
    <>
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
                        onClick={() => openDetail(event)}
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

        {events.length === 0 && (
          <div className="p-4 mx-4 mb-4 bg-slate-50 rounded-lg text-center text-slate-500">
            <p className="font-medium">Aucun rappel planifié</p>
            <p className="text-sm mt-1">
              Les codes courrier avec une date de rappel apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {/* Modal détail / suivi */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Code courrier</h3>
              <button
                onClick={() => { setShowDetailModal(null); setFollowUpAction(""); setCallbackDate(""); }}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nom</p>
                  <p className="font-medium text-slate-800">{showDetailModal.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prénom</p>
                  <p className="font-medium text-slate-800">{showDetailModal.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Téléphone</p>
                  <p className="font-medium text-slate-800">{showDetailModal.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date de création</p>
                  <p className="font-medium text-slate-800">{formatDateParis(showDetailModal.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jours écoulés</p>
                  <p className="font-medium text-slate-800">{getDaysSinceCreation(showDetailModal.created_at)} jour(s)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NRP</p>
                  <p className="font-medium text-slate-800">{showDetailModal.nrp_count}</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Suivi</label>
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
                onClick={() => { setShowDetailModal(null); setFollowUpAction(""); setCallbackDate(""); }}
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
    </>
  );
}
