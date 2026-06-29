"use client";

import { type LeadStatus } from "@/lib/types";
import { formatDateTimeParis } from "@/lib/date";
import { StatusBadge } from "@/components/StatusBadge";

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
      <div className="bg-white rounded-[12px] border border-[#e1e8f2] p-4 shadow-[0_1px_2px_rgba(13,38,76,.06)] sticky top-24">
        <h2 className="text-lg font-semibold text-[#0b1f3a] mb-4">Historique</h2>
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-[#64748b]">Aucun log</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 py-2 border-b border-[#e1e8f2] last:border-0"
              >
                <span className="text-xs text-[#64748b]">
                  {formatDateTimeParis(log.created_at)}
                </span>
                <span className="text-sm text-[#0b1f3a]">
                  {log.action}
                </span>
                {(log.old_status || log.new_status) && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {log.old_status && (
                      <StatusBadge status={log.old_status as LeadStatus} />
                    )}
                    {log.old_status && log.new_status && (
                      <span className="text-xs text-[#64748b]">→</span>
                    )}
                    {log.new_status && (
                      <StatusBadge status={log.new_status as LeadStatus} />
                    )}
                  </div>
                )}
                {log.profile && (
                  <span className="text-xs text-[#64748b]">
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
