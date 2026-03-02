"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";
import { formatDateParis } from "@/lib/date";

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
    case "ancien_documents_recus": return "bg-slate-500 text-white border-slate-600";
    case "annule": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

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
    case "ancien_documents_recus": return "bg-slate-100 hover:bg-slate-200";
    case "annule": return "bg-red-50 hover:bg-red-100";
    default: return "hover:bg-slate-50";
  }
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  nrp_count: number;
  is_duplicate: boolean;
  profile: { full_name: string; email: string } | null;
  added_at: string | null;
  commentaire: string | null;
}

interface AdminLeadsTableProps {
  leads: Lead[];
  telepros: { id: string; full_name: string | null; email: string }[];
  /** Exclure ce télépro de la liste des cibles (ex: page redistribution) */
  excludeTeleproId?: string;
}

export function AdminLeadsTable({ leads, telepros, excludeTeleproId }: AdminLeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleStatusChange = useCallback(async (leadId: string, newStatus: LeadStatus, oldStatus: string) => {
    if (newStatus === oldStatus) return;
    setUpdatingId(leadId);
    const body: Record<string, unknown> = {
      status: newStatus,
      logAction: "Changement de statut",
      logOldStatus: oldStatus,
      logNewStatus: newStatus,
    };
    if (newStatus === "a_rappeler") body.callback_at = null;
    const res = await fetch(`/api/admin/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    setUpdatingId(null);
    if (res.ok) router.refresh();
  }, [router]);

  const handleCommentSave = useCallback(async (leadId: string, value: string) => {
    setEditingCommentId(null);
    const res = await fetch(`/api/admin/lead/${leadId}`, {
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

  const targetTelepros = excludeTeleproId
    ? telepros.filter((t) => t.id !== excludeTeleproId)
    : telepros;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  };

  const [deleting, setDeleting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleBulkStatusChange = async () => {
    if (selected.size === 0 || !bulkStatus) return;
    setUpdatingStatus(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/update-leads-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadIds: Array.from(selected),
          newStatus: bulkStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSelected(new Set());
        setBulkStatus("");
        setError(null);
        router.refresh();
      } else {
        setError(data?.error || `Erreur ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Supprimer ${selected.size} lead(s) ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leadIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSelected(new Set());
        setError(null);
        router.refresh();
      } else {
        setError(data?.error || `Erreur ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setDeleting(false);
    }
  };

  const handleTransfer = async () => {
    if (selected.size === 0 || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/transfer-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadIds: Array.from(selected),
          targetTeleproId: targetId,
        }),
      });
      const text = await res.text();
      let data: { error?: string; message?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || `Réponse invalide (${res.status})` };
      }
      if (res.ok) {
        setSelected(new Set());
        setTargetId("");
        setError(null);
        router.refresh();
      } else {
        const msg = data?.error || data?.message || `Erreur ${res.status}: ${text.slice(0, 200) || res.statusText}`;
        setError(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Fermer
          </button>
        </div>
      )}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <span className="font-medium text-slate-800">
            {selected.size} lead(s) sélectionné(s)
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => {
              setBulkStatus(e.target.value);
              setError(null);
            }}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">Changer le statut...</option>
            {LEAD_STATUSES_ADMIN.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkStatusChange}
            disabled={!bulkStatus || updatingStatus}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {updatingStatus ? "Mise à jour..." : "Appliquer statut"}
          </button>
          <select
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setError(null);
            }}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">
              {targetTelepros.length === 0
                ? "Aucun télépro disponible"
                : "Transférer vers..."}
            </option>
            {targetTelepros.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleTransfer}
            disabled={!targetId || loading || targetTelepros.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Transfert..." : "Transférer"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </button>
          <button
            onClick={() => {
              setSelected(new Set());
              setError(null);
            }}
            className="text-slate-600 hover:text-slate-800"
          >
            Annuler
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-2">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-700">
                  Nom
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-700">
                  Téléphone
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                  Statut
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                  Télépro
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
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Aucun lead trouvé
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/admin/leads/${lead.id}`)}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${getRowStatusClass(lead.status)}`}
                  >
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded"
                      />
                    </td>
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
                      className="py-3 px-4"
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
                    <td className="py-3 px-4 text-slate-600">
                      {lead.profile?.full_name || lead.profile?.email || "-"}
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
    </div>
  );
}
