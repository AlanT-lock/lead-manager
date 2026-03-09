"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatDateParis, formatTimeParis } from "@/lib/date";

const DISMISSED_STORAGE_KEY = "rappels-notifications-dismissed";

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

interface RappelDue {
  id: string;
  name: string;
  description: string | null;
  callback_at: string;
  created_at: string;
}

export function RappelsNotifications() {
  const [entries, setEntries] = useState<RappelDue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const router = useRouter();

  const fetchDue = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rappels-due", { credentials: "include" });
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

  useEffect(() => {
    fetchDue();
    const interval = setInterval(fetchDue, 60000);
    return () => clearInterval(interval);
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

  const handleClick = (id: string) => {
    router.push(`/admin/agenda-courrier`);
  };

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((entry) => (
        <div
          key={entry.id}
          role="button"
          tabIndex={0}
          onClick={() => handleClick(entry.id)}
          onKeyDown={(e) => e.key === "Enter" && handleClick(entry.id)}
          className="bg-slate-50 border border-slate-200 rounded-lg p-4 shadow-lg hover:bg-slate-100 cursor-pointer transition-colors flex items-start gap-3 w-full"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900">{entry.name}</p>
            {entry.description && (
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{entry.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {formatDateParis(entry.callback_at)} à {formatTimeParis(entry.callback_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => handleDismiss(e, entry.id)}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </>
  );
}
