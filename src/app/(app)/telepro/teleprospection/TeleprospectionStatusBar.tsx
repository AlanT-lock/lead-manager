"use client";

import { useState, useEffect } from "react";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";
import {
  toDatetimeLocalValueParis,
  fromDatetimeLocalValueParis,
} from "@/lib/date";

function formatPhoneDisplay(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.startsWith("33") && digits.length >= 11) {
    return `+33 ${digits.slice(2, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+33 ${digits.slice(1, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return String(phone ?? "");
}

function getStatusButtonClass(status: LeadStatus, isSelected: boolean): string {
  if (!isSelected) return "bg-slate-100 hover:bg-slate-200";
  switch (status) {
    case "nouveau": return "bg-blue-100 text-blue-800";
    case "nrp": return "bg-yellow-100 text-yellow-800";
    case "a_rappeler": return "bg-blue-800 text-white";
    case "en_attente_doc": return "bg-green-100 text-green-800";
    case "documents_recus": return "bg-green-700 text-white";
    case "incomplet": return "bg-amber-100 text-amber-800";
    case "bloque_mpr": return "bg-red-800 text-white";
    case "valide": return "bg-emerald-700 text-white";
    case "ancien_documents_recus": return "bg-slate-500 text-white";
    case "annule": return "bg-red-100 text-red-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function getDefaultCallbackDatetime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  return toDatetimeLocalValueParis(d.toISOString());
}

function StatusButton({
  status,
  currentStatus,
  initialCallbackAt,
  onSelect,
  disabled,
}: {
  status: LeadStatus;
  currentStatus: LeadStatus;
  initialCallbackAt?: string | null;
  onSelect: (callbackAt?: string) => void;
  disabled: boolean;
}) {
  const isAlreadyRappeler = currentStatus === "a_rappeler";
  const [showCallback, setShowCallback] = useState(isAlreadyRappeler);
  const [callbackAt, setCallbackAt] = useState(() =>
    initialCallbackAt ? toDatetimeLocalValueParis(initialCallbackAt) : getDefaultCallbackDatetime()
  );

  useEffect(() => {
    if (initialCallbackAt) {
      setCallbackAt(toDatetimeLocalValueParis(initialCallbackAt));
    }
  }, [initialCallbackAt]);

  const handleSaveCallback = () => {
    if (!callbackAt) return;
    const iso = fromDatetimeLocalValueParis(callbackAt);
    if (!iso) return;
    onSelect(iso);
    setShowCallback(false);
  };

  if (status === "a_rappeler") {
    return (
      <div className="inline-block">
        {showCallback && (
          <div className="flex gap-2 items-center">
            <input
              type="datetime-local"
              value={callbackAt}
              onChange={(e) => setCallbackAt(e.target.value)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-base"
            />
            <button
              type="button"
              onClick={handleSaveCallback}
              disabled={disabled || !callbackAt}
              className="px-5 py-2.5 bg-blue-800 text-white rounded-lg text-base font-medium hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              OK
            </button>
            {!isAlreadyRappeler && (
              <button
                type="button"
                onClick={() => setShowCallback(false)}
                className="text-slate-500 text-base hover:text-slate-700"
              >
                Annuler
              </button>
            )}
          </div>
        )}
        {!showCallback && (
          <button
            type="button"
            onClick={() => setShowCallback(true)}
            disabled={disabled}
            className={`px-5 py-3 rounded-lg text-base font-medium ${getStatusButtonClass(status, currentStatus === status)}`}
          >
            {LEAD_STATUS_LABELS[status]}
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect()}
      disabled={disabled}
      className={`px-5 py-3 rounded-lg text-base font-medium ${getStatusButtonClass(status, currentStatus === status)}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </button>
  );
}

interface TeleprospectionStatusBarProps {
  lead: Record<string, unknown>;
  leadId: string;
  nextLeadId: string | null;
  onStatusChangeSuccess: (nextId: string | null, removedLeadId?: string) => void;
  onNrpClickSuccess: (nextId: string | null) => void;
  onLeadUpdate: (updates: Record<string, unknown>) => void;
}

export function TeleprospectionStatusBar({
  lead,
  leadId,
  nextLeadId,
  onStatusChangeSuccess,
  onNrpClickSuccess,
  onLeadUpdate,
}: TeleprospectionStatusBarProps) {
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async (newStatus: LeadStatus, callbackAt?: string) => {
    if (!lead || saving) return;
    setSaving(true);
    const updates = {
      status: newStatus,
      callback_at: newStatus === "a_rappeler" && callbackAt ? callbackAt : null,
    };
    const res = await fetch(`/api/telepro/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...updates,
        logAction: "Changement de statut",
        logOldStatus: lead.status,
        logNewStatus: newStatus,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onLeadUpdate(updates);
      onStatusChangeSuccess(nextLeadId ?? null, newStatus === "annule" ? leadId : undefined);
    }
  };

  const handleNrpClick = async () => {
    if (!lead || saving) return;
    setSaving(true);
    const newCount = ((lead.nrp_count as number) || 0) + 1;
    const res = await fetch(`/api/telepro/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        nrp_count: newCount,
        logAction: "NRP - Lead rappelé sans réponse",
        logOldStatus: "nrp",
        logNewStatus: "nrp",
      }),
    });
    setSaving(false);
    if (res.ok) {
      onLeadUpdate({ nrp_count: newCount });
      onNrpClickSuccess(nextLeadId ?? null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-4">
      <div className="space-y-4">
        <div>
          <p className="text-xl font-semibold text-slate-800">
            {String(lead.first_name ?? "")} {String(lead.last_name ?? "")}
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatPhoneDisplay(lead.phone as string)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {LEAD_STATUSES_ADMIN.map((s) => (
            <StatusButton
              key={s}
              status={s}
              currentStatus={lead.status as LeadStatus}
              initialCallbackAt={lead.callback_at as string | null | undefined}
              onSelect={(callbackAt) => handleStatusChange(s, callbackAt)}
              disabled={saving}
            />
          ))}
        </div>
        {(lead.status as string) === "nrp" && (
          <button
            type="button"
            onClick={handleNrpClick}
            disabled={saving}
            className="px-5 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-base font-medium"
          >
            Toujours NRP (appelé {(lead.nrp_count as number) || 0} fois)
          </button>
        )}
      </div>
    </div>
  );
}
