"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface CallbackLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  callback_at: string;
}

export function CallbackNotifications() {
  const [leads, setLeads] = useState<CallbackLead[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchDue = useCallback(async () => {
    try {
      const res = await fetch("/api/telepro/callback-due", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Ne pas poller quand l'onglet est en arrière-plan (évite requêtes inutiles si personne n'utilise)
  useEffect(() => {
    fetchDue();
    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (!interval) interval = setInterval(fetchDue, 60000);
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stopPolling();
      else {
        fetchDue();
        startPolling();
      }
    };
    if (!document.hidden) startPolling();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchDue]);

  const visible = leads.filter((l) => !dismissed.has(l.id));

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleClick = (id: string) => {
    router.push(`/telepro/teleprospection?lead=${id}`);
  };

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visible.map((lead) => (
        <div
          key={lead.id}
          role="button"
          tabIndex={0}
          onClick={() => handleClick(lead.id)}
          onKeyDown={(e) => e.key === "Enter" && handleClick(lead.id)}
          className="bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-lg hover:bg-rose-100 cursor-pointer transition-colors flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-rose-900">
              {lead.first_name} {lead.last_name}
            </p>
            <p className="text-sm text-rose-700">{lead.phone}</p>
            <p className="text-xs text-rose-600 mt-1">Rappel à effectuer</p>
          </div>
          <button
            type="button"
            onClick={(e) => handleDismiss(e, lead.id)}
            className="p-1 rounded hover:bg-rose-200 text-rose-600 shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
