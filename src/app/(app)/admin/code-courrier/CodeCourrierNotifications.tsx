"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

interface CodeCourrierDue {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  callback_at: string | null;
}

export function CodeCourrierNotifications() {
  const [entries, setEntries] = useState<CodeCourrierDue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
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
    fetchDue();
    const interval = setInterval(fetchDue, 60000);
    return () => clearInterval(interval);
  }, [fetchDue]);

  const visible = entries.filter((e) => !dismissed.has(e.id));

  const handleDismiss = (ev: React.MouseEvent, id: string) => {
    ev.stopPropagation();
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleClick = (id: string) => {
    router.push(`/admin/code-courrier?detail=${id}`);
    router.refresh();
  };

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 max-w-sm">
      <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white shadow-xl">
        <Image
          src="/code-courrier-avatar.png"
          alt="Rappels code courrier"
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
      {visible.map((entry) => (
        <div
          key={entry.id}
          role="button"
          tabIndex={0}
          onClick={() => handleClick(entry.id)}
          onKeyDown={(e) => e.key === "Enter" && handleClick(entry.id)}
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
    </div>
  );
}
