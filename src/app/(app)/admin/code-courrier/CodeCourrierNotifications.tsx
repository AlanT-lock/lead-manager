"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { formatDateParis, fromDatetimeLocalValueParis, toDatetimeLocalValueParis } from "@/lib/date";

const DISMISSED_STORAGE_KEY = "code-courrier-notifications-dismissed";

function loadDismissedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedToStorage(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

interface CodeCourrierDue {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  callback_at: string | null;
}

function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function CodeCourrierNotifications() {
  const [entries, setEntries] = useState<CodeCourrierDue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CodeCourrierDue | null>(null);
  const [followUpAction, setFollowUpAction] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const fetchDue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/code-courrier-due", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setDismissed(loadDismissedFromStorage());
    setDismissedLoaded(true);
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

  const visible = dismissedLoaded ? entries.filter((e) => !dismissed.has(e.id)) : [];

  const handleDismiss = (ev: React.MouseEvent, id: string) => {
    ev.stopPropagation();
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      saveDismissedToStorage(next);
      return next;
    });
  };

  const handleClick = (entry: CodeCourrierDue) => {
    setSelectedEntry(entry);
    setFollowUpAction("");
    setCallbackDate("");
  };

  const closeModal = () => {
    setSelectedEntry(null);
    setFollowUpAction("");
    setCallbackDate("");
  };

  const handleFollowUp = async () => {
    if (!selectedEntry || !followUpAction) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action: followUpAction };
      if (followUpAction === "a_rappeler" && callbackDate) {
        body.callback_at = fromDatetimeLocalValueParis(callbackDate);
      }
      await fetch(`/api/admin/code-courrier/${selectedEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      closeModal();
      setDismissed((prev) => {
        const next = new Set(prev).add(selectedEntry.id);
        saveDismissedToStorage(next);
        return next;
      });
      fetchDue();
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {visible.length > 0 && (
        <>
          {/* Photo uniquement pour les rappels code courrier */}
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl shrink-0">
            <Image
              src="/code-courrier-avatar.png"
              alt="Rappels code courrier"
              width={112}
              height={112}
              className="w-full h-full object-cover"
            />
          </div>
          {visible.map((entry) => (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(entry)}
              onKeyDown={(e) => e.key === "Enter" && handleClick(entry)}
              className="bg-rose-50 border border-rose-200 rounded-lg p-4 shadow-lg hover:bg-rose-100 cursor-pointer transition-colors flex items-start gap-3 w-full"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-rose-900">
                  {entry.first_name} {entry.last_name}
                </p>
                <p className="text-sm text-rose-700">{entry.phone}</p>
                <p className="text-xs text-rose-600 mt-1">Rappel code courrier</p>
              </div>
              <button
                type="button"
                onClick={(e) => handleDismiss(e, entry.id)}
                className="p-1 rounded hover:bg-rose-200 text-rose-600 shrink-0"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </>
      )}

      {/* Modal suivi */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Code courrier</h3>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nom</p>
                  <p className="font-medium text-slate-800">{selectedEntry.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Prénom</p>
                  <p className="font-medium text-slate-800">{selectedEntry.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Téléphone</p>
                  <p className="font-medium text-slate-800">{selectedEntry.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date de création</p>
                  <p className="font-medium text-slate-800">{formatDateParis(selectedEntry.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jours écoulés</p>
                  <p className="font-medium text-slate-800">{getDaysSinceCreation(selectedEntry.created_at)} jour(s)</p>
                </div>
              </div>

              {selectedEntry.callback_at && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Rappel prévu le {formatDateParis(selectedEntry.callback_at)}
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
                onClick={closeModal}
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
