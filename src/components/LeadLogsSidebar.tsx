"use client";

import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types";
import { formatDateTimeParis } from "@/lib/date";

export interface LogEntry {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  profile?: { full_name: string };
}

interface LeadLogsSidebarProps {
  logs: LogEntry[];
}

export function LeadLogsSidebar({ logs }: LeadLogsSidebarProps) {
  return (
    <div className="w-80 shrink-0">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm sticky top-24">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Historique</h2>
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun log</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 py-2 border-b border-slate-100 last:border-0"
              >
                <span className="text-xs text-slate-500">
                  {formatDateTimeParis(log.created_at)}
                </span>
                <span className="text-sm text-slate-700">
                  {log.action}
                  {log.old_status && (
                    <span className="text-slate-500">
                      {" "}
                      {LEAD_STATUS_LABELS[log.old_status as LeadStatus]} →
                    </span>
                  )}
                  {log.new_status && (
                    <span className="font-medium">
                      {" "}
                      {LEAD_STATUS_LABELS[log.new_status as LeadStatus]}
                    </span>
                  )}
                </span>
                {log.profile && (
                  <span className="text-xs text-slate-400">
                    {(log.profile as { full_name: string }).full_name}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
