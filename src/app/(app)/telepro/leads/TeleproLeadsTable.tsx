"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";
import { formatDateParis, formatFullDateTimeParis } from "@/lib/date";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

function getRowStatusClass(status: string): string {
  switch (status) {
    case "nouveau": return "bg-blue-50 hover:bg-blue-100";
    case "nrp": return "bg-yellow-50 hover:bg-yellow-100";
    case "a_rappeler": return "bg-blue-200 hover:bg-blue-300";
    case "en_attente_doc": return "bg-green-50 hover:bg-green-100";
    case "documents_recus": return "bg-green-200 hover:bg-green-300";
    case "incomplet": return "bg-amber-50 hover:bg-amber-100";
    case "bloque_mpr": return "bg-red-100 hover:bg-red-200";
    case "valide": return "bg-emerald-100 hover:bg-emerald-200";
    case "installe": return "bg-teal-50 hover:bg-teal-100";
    case "ancien_documents_recus": return "bg-slate-100 hover:bg-slate-200";
    case "annule": return "bg-red-50 hover:bg-red-100";
    default: return "hover:bg-slate-50";
  }
}

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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-700">
                Nom
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-700">
                Téléphone
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                <button
                  type="button"
                  onClick={toggleStatusSort}
                  className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Statut
                  {statusSort === "none" && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
                  {statusSort === "desc" && <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                  {statusSort === "asc" && <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Rappel
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Date ajout
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700 min-w-[180px]">
                Commentaires
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Aucun lead trouvé
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/telepro/leads/${lead.id}`)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors ${getRowStatusClass(lead.status)}`}
                >
                  <td className="py-3 px-2">
                    <span className="font-medium text-slate-800">
                      {lead.first_name} {lead.last_name}
                      {lead.is_duplicate && (
                        <span className="ml-2 text-xs text-amber-600">
                          Doublon
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-700">{lead.phone}</td>
                  <td
                    className="py-4 px-4"
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
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:opacity-50 ${getStatusSelectClass(lead.status)}`}
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
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {lead.callback_at
                      ? formatFullDateTimeParis(lead.callback_at)
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-sm">
                    {lead.added_at
                      ? formatDateParis(lead.added_at)
                      : "-"}
                  </td>
                  <td
                    className="py-3 px-4 min-w-[180px]"
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
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full text-left px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded truncate block"
                        title={lead.commentaire ?? "Cliquer pour ajouter un commentaire"}
                      >
                        {lead.commentaire || "—"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
