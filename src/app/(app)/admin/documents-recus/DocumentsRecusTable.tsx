"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDateParis } from "@/lib/date";
import { INSTALLATION_TYPE_LABELS, type InstallationType } from "@/lib/types";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  delegataire_group: string | null;
  profile: { full_name: string } | null;
  is_installe: boolean;
  is_depot_mpr: boolean;
  is_cee_paye: boolean;
  is_mpe_paye: boolean;
  profitability: number | null;
  added_at: string | null;
  commentaire: string | null;
  installation_type: InstallationType | null;
}

interface DocumentsRecusTableProps {
  leads: Lead[];
}

export function DocumentsRecusTable({ leads }: DocumentsRecusTableProps) {
  const router = useRouter();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const handleCommentSave = useCallback(async (leadId: string, value: string) => {
    setEditingCommentId(null);
    const res = await fetch(`/api/admin/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Lead-Form-Version": "2" },
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
                Mandataire
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Type d'installation
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Télépro
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Installé
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Dépôt MPR
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                CEE payé
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                MPR payé
              </th>
              <th className="text-left py-4 px-4 text-sm font-medium text-slate-700">
                Rentabilité
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
                <td colSpan={11} className="py-12 text-center text-slate-500">
                  Aucun lead en Documents reçus
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/admin/leads/${lead.id}`)}
                  className="border-b border-slate-100 cursor-pointer bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <td className="py-3 px-2">
                    <span className="font-medium text-slate-800">
                      {lead.first_name} {lead.last_name}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-600">
                    {lead.delegataire_group || "—"}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {lead.installation_type
                      ? INSTALLATION_TYPE_LABELS[lead.installation_type]
                      : "—"}
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {lead.profile?.full_name || "-"}
                  </td>
                  <td className="py-4 px-4">
                    {lead.is_installe ? "✓" : "-"}
                  </td>
                  <td className="py-4 px-4">
                    {lead.is_depot_mpr ? "✓" : "-"}
                  </td>
                  <td className="py-4 px-4">
                    {lead.is_cee_paye ? "✓" : "-"}
                  </td>
                  <td className="py-4 px-4">
                    {lead.is_mpe_paye ? "✓" : "-"}
                  </td>
                  <td className="py-4 px-4 font-medium">
                    {lead.profitability != null
                      ? `${Number(lead.profitability).toFixed(2)} €`
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
