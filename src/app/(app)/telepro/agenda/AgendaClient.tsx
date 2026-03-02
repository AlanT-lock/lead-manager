"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatTimeParis } from "@/lib/date";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AgendaEvent {
  id: string;
  title: string;
  phone: string;
  callback_at: string;
}

interface AgendaClientProps {
  events: AgendaEvent[];
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AgendaClient({ events }: AgendaClientProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  const handleEventClick = (leadId: string) => {
    router.push(`/telepro/leads/${leadId}`);
  };

  return (
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
                      onClick={() => handleEventClick(event.id)}
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
            Les leads en statut &quot;À rappeler&quot; avec une date de rappel apparaîtront ici.
          </p>
        </div>
      )}
    </div>
  );
}
