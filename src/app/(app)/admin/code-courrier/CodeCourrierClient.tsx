"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Calendar as CalendarIcon } from "lucide-react";
import { formatDateParis, fromDatetimeLocalValueParis, toDatetimeLocalValueParis } from "@/lib/date";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const SELECT_CLS =
  "w-full h-8 px-2.5 text-sm border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40";

const LABEL_CLS = "block text-sm font-medium text-[#0b1f3a] mb-1";

interface CodeCourrier {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  nrp_count: number;
  callback_at: string | null;
  assigned_to: string | null;
  assigned_to_manual: string | null;
  created_at: string;
  updated_at: string;
  profile: { full_name: string | null; email: string } | null;
}

interface Telepro {
  id: string;
  full_name: string | null;
  email: string;
}

interface CodeCourrierClientProps {
  codeCourriers: CodeCourrier[];
  telepros: Telepro[];
}

function getTeleproLabel(cc: CodeCourrier): string {
  if (cc.assigned_to_manual) return cc.assigned_to_manual;
  return cc.profile?.full_name || cc.profile?.email || "—";
}

function getDaysSinceCreation(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

function getDayCounterColor(days: number): string {
  if (days <= 0) return "rgb(34, 197, 94)";
  if (days >= 10) return "rgb(239, 68, 68)";
  const ratio = days / 10;
  const r = Math.round(34 + (239 - 34) * ratio);
  const g = Math.round(197 + (68 - 197) * ratio);
  const b = Math.round(94 + (68 - 94) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export function CodeCourrierClient({ codeCourriers, telepros }: CodeCourrierClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<CodeCourrier | null>(null);
  const [creating, setCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [followUpAction, setFollowUpAction] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/code-courrier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          assigned_to: assignedTo || undefined,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFirstName("");
        setLastName("");
        setPhone("");
        setAssignedTo("");
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce code courrier ?")) return;
    await fetch(`/api/admin/code-courrier/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    router.refresh();
  };

  const handleFollowUp = async () => {
    if (!showDetailModal || !followUpAction) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action: followUpAction };
      if (followUpAction === "a_rappeler" && callbackDate) {
        body.callback_at = fromDatetimeLocalValueParis(callbackDate);
      }
      await fetch(`/api/admin/code-courrier/${showDetailModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setShowDetailModal(null);
      setFollowUpAction("");
      setCallbackDate("");
      router.refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (cc: CodeCourrier) => {
    setShowDetailModal(cc);
    setFollowUpAction("");
    setCallbackDate("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Code courrier"
        subtitle="Gestion des codes courrier"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus />
            Nouveau code courrier
          </Button>
        }
      />

      {/* Tableau */}
      <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f8fafd]">
            <TableRow>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Nom</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Prénom</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">N° de tél</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Télépro</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Date de création</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">Jours</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide">NRP / Rappel</TableHead>
              <TableHead className="py-3 px-4 text-xs font-semibold text-[#64748b] uppercase tracking-wide text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codeCourriers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-[#64748b]">
                  Aucun code courrier
                </TableCell>
              </TableRow>
            ) : (
              codeCourriers.map((cc) => {
                const dayCount = getDaysSinceCreation(cc.created_at);
                const dayColor = getDayCounterColor(dayCount);
                return (
                  <TableRow
                    key={cc.id}
                    onClick={() => openDetail(cc)}
                    className="cursor-pointer"
                  >
                    <TableCell className="py-3 px-4 font-medium text-[#0b1f3a]">{cc.last_name}</TableCell>
                    <TableCell className="py-3 px-4 text-[#0b1f3a]">{cc.first_name}</TableCell>
                    <TableCell className="py-3 px-4 text-[#64748b]">{cc.phone}</TableCell>
                    <TableCell className="py-3 px-4 text-[#64748b] text-sm">{getTeleproLabel(cc)}</TableCell>
                    <TableCell className="py-3 px-4 text-[#64748b] text-sm">{formatDateParis(cc.created_at)}</TableCell>
                    <TableCell className="py-3 px-4">
                      <span
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold"
                        style={{ backgroundColor: dayColor }}
                      >
                        {dayCount}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm">
                      {cc.callback_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dbeafe] text-[#1e40af] text-xs font-medium">
                          <CalendarIcon className="w-3 h-3" />
                          {formatDateParis(cc.callback_at)}
                        </span>
                      ) : (
                        <span className="text-[#64748b]">
                          {cc.nrp_count > 0 ? `${cc.nrp_count} NRP` : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(cc.id)}
                        title="Supprimer"
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e1e8f2]">
              <h3 className="text-lg font-semibold text-[#0b1f3a]">Nouveau code courrier</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowCreateModal(false)}>
                <X />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={LABEL_CLS}>Télépro assigné</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">— Sélectionner —</option>
                  {telepros.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </option>
                  ))}
                  <option value="__manual_roy">Roy</option>
                  <option value="__manual_noemie">Noémie</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Nom</label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom de famille"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Prénom</label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>N° de téléphone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#e1e8f2] flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !firstName.trim() || !lastName.trim() || !phone.trim()}
              >
                {creating ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail / suivi */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#e1e8f2]">
              <h3 className="text-lg font-semibold text-[#0b1f3a]">Code courrier</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => { setShowDetailModal(null); setFollowUpAction(""); setCallbackDate(""); }}
              >
                <X />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#64748b]">Nom</p>
                  <p className="font-medium text-[#0b1f3a]">{showDetailModal.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Prénom</p>
                  <p className="font-medium text-[#0b1f3a]">{showDetailModal.first_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Téléphone</p>
                  <p className="font-medium text-[#0b1f3a]">{showDetailModal.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Télépro</p>
                  <p className="font-medium text-[#0b1f3a]">{getTeleproLabel(showDetailModal)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Date de création</p>
                  <p className="font-medium text-[#0b1f3a]">{formatDateParis(showDetailModal.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Jours écoulés</p>
                  <p className="font-medium text-[#0b1f3a]">{getDaysSinceCreation(showDetailModal.created_at)} jour(s)</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">NRP</p>
                  <p className="font-medium text-[#0b1f3a]">{showDetailModal.nrp_count}</p>
                </div>
              </div>

              {showDetailModal.callback_at && (
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px] p-3">
                  <p className="text-sm text-[#1e40af]">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Rappel prévu le {formatDateParis(showDetailModal.callback_at)}
                  </p>
                </div>
              )}

              <div className="border-t border-[#e1e8f2] pt-3">
                <label className="block text-sm font-medium text-[#0b1f3a] mb-2">Suivi</label>
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
                  className={SELECT_CLS}
                >
                  <option value="">Sélectionner une action...</option>
                  <option value="nrp">NRP</option>
                  <option value="a_rappeler">À rappeler</option>
                  <option value="annule">Annulé</option>
                </select>

                {followUpAction === "a_rappeler" && (
                  <div className="mt-3">
                    <label className={LABEL_CLS}>Date et heure du rappel</label>
                    <Input
                      type="datetime-local"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-[#e1e8f2] flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowDetailModal(null); setFollowUpAction(""); setCallbackDate(""); }}
              >
                Fermer
              </Button>
              <Button
                onClick={handleFollowUp}
                disabled={actionLoading || !followUpAction || (followUpAction === "a_rappeler" && !callbackDate)}
              >
                {actionLoading ? "En cours..." : "Valider"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
