"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";
import { formatDateParis, formatFullDateTimeParis } from "@/lib/date";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function getStatusSelectClass(status: string): string {
  switch (status) {
    case "nouveau": return "bg-blue-100 text-blue-800 border-blue-200";
    case "nrp": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "a_rappeler": return "bg-blue-800 text-white border-blue-900";
    case "en_attente_doc": return "bg-green-100 text-green-800 border-green-200";
    case "documents_recus": return "bg-green-700 text-white border-green-800";
    case "incomplet": return "bg-amber-100 text-amber-800 border-amber-200";
    case "bloque_mpr": return "bg-red-800 text-white border-red-900";
    case "valide": return "bg-emerald-700 text-white border-emerald-800";
    case "installe": return "bg-teal-200 text-teal-900 border-teal-300";
    case "ancien_documents_recus": return "bg-slate-500 text-white border-slate-600";
    case "annule": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

type StatusSortDirection = "none" | "desc" | "asc";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  callback_at: string | null;
  nrp_count: number;
  is_duplicate: boolean;
  added_at: string | null;
  commentaire: string | null;
  status_changed_at: string | null;
}

interface TeleproLeadsTableProps {
  leads: Lead[];
}

export function TeleproLeadsTable({ leads }: TeleproLeadsTableProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [statusSort, setStatusSort] = useState<StatusSortDirection>("none");

  const sortedLeads = useMemo(() => {
    if (statusSort === "none") return leads;
    return [...leads].sort((a, b) => {
      const dateA = a.status_changed_at ? new Date(a.status_changed_at).getTime() : 0;
      const dateB = b.status_changed_at ? new Date(b.status_changed_at).getTime() : 0;
      return statusSort === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [leads, statusSort]);

  const toggleStatusSort = () => {
    setStatusSort((prev) => {
      if (prev === "none") return "desc";
      if (prev === "desc") return "asc";
      return "none";
    });
  };

  const handleCommentSave = useCallback(async (leadId: string, value: string) => {
    setEditingCommentId(null);
    const res = await fetch(`/api/telepro/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ commentaire: value || null }),
    });
    if (res.ok) router.refresh();
    setCommentDrafts((d) => {
      const next = { ...d };
      delete next[leadId];
      return next;
    });
  }, [router]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus, oldStatus: string) => {
    if (newStatus === oldStatus) return;
    if (newStatus === "ancien_documents_recus") return; // Non sélectionnable par télépro
    setUpdatingId(leadId);

    const body: Record<string, unknown> = {
      status: newStatus,
      logAction: "Changement de statut",
      logOldStatus: oldStatus,
      logNewStatus: newStatus,
    };
    if (newStatus === "a_rappeler") {
      body.callback_at = null;
    }

    const res = await fetch(`/api/telepro/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    setUpdatingId(null);
    if (res.ok) router.refresh();
  };

  return (
    <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
      <Table>
        <TableHeader className="bg-[#f4f7fb] border-b border-[#e1e8f2]">
          <TableRow className="hover:bg-transparent border-0">
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Nom
            </TableHead>
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Téléphone
            </TableHead>
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              <button
                type="button"
                onClick={toggleStatusSort}
                className="inline-flex items-center gap-1 hover:text-[#0b1f3a] transition-colors"
              >
                Statut
                {statusSort === "none" && <ArrowUpDown className="w-3.5 h-3.5 text-[#64748b]" />}
                {statusSort === "desc" && <ArrowDown className="w-3.5 h-3.5 text-[#2563eb]" />}
                {statusSort === "asc" && <ArrowUp className="w-3.5 h-3.5 text-[#2563eb]" />}
              </button>
            </TableHead>
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Rappel
            </TableHead>
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide">
              Date ajout
            </TableHead>
            <TableHead className="py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wide min-w-[180px]">
              Commentaires
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center text-[#64748b]">
                Aucun lead trouvé
              </TableCell>
            </TableRow>
          ) : (
            sortedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                onClick={() => router.push(`/telepro/leads/${lead.id}`)}
                className="border-b border-[#e1e8f2] cursor-pointer hover:bg-[#f4f7fb] transition-colors"
                data-testid="lead-row"
                data-lead-id={lead.id}
              >
                <TableCell className="py-3">
                  <span className="font-medium text-[#0b1f3a]">
                    {lead.first_name} {lead.last_name}
                    {lead.is_duplicate && (
                      <span className="ml-2 text-xs text-amber-600">
                        Doublon
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-[#64748b]">{lead.phone}</TableCell>
                <TableCell
                  className="py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={lead.status}
                    onChange={(e) =>
                      handleStatusChange(
                        lead.id,
                        e.target.value as LeadStatus,
                        lead.status
                      )
                    }
                    disabled={updatingId === lead.id}
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-[9px] border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:ring-offset-1 disabled:opacity-50 ${getStatusSelectClass(lead.status)}`}
                  >
                    {lead.status === "ancien_documents_recus" && (
                      <option value="ancien_documents_recus" disabled>
                        {LEAD_STATUS_LABELS.ancien_documents_recus}
                      </option>
                    )}
                    {LEAD_STATUSES_ADMIN.map((s) => (
                      <option key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                        {s === "nrp" && lead.nrp_count > 0
                          ? ` (${lead.nrp_count})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="py-3 text-[#64748b]">
                  {lead.callback_at
                    ? formatFullDateTimeParis(lead.callback_at)
                    : "-"}
                </TableCell>
                <TableCell className="py-3 text-[#64748b] text-sm">
                  {lead.added_at
                    ? formatDateParis(lead.added_at)
                    : "-"}
                </TableCell>
                <TableCell
                  className="py-3 min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {editingCommentId === lead.id ? (
                    <input
                      type="text"
                      value={commentDrafts[lead.id] ?? lead.commentaire ?? ""}
                      onChange={(e) =>
                        setCommentDrafts((d) => ({
                          ...d,
                          [lead.id]: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        handleCommentSave(
                          lead.id,
                          commentDrafts[lead.id] ?? lead.commentaire ?? ""
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-[#e1e8f2] rounded-[9px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCommentId(lead.id);
                        setCommentDrafts((d) => ({
                          ...d,
                          [lead.id]: lead.commentaire ?? "",
                        }));
                      }}
                      className="w-full text-left px-2 py-1 text-sm text-[#64748b] hover:bg-[#f4f7fb] rounded-[9px] truncate block"
                      title={lead.commentaire ?? "Cliquer pour ajouter un commentaire"}
                    >
                      {lead.commentaire || "—"}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
