"use client";

import { useState, useEffect } from "react";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_TELEPRO, type LeadStatus } from "@/lib/types";
import {
  toDatetimeLocalValueParis,
  fromDatetimeLocalValueParis,
} from "@/lib/date";

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
  onStatusChangeSuccess: (nextId: string | null) => void;
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
      onStatusChangeSuccess(nextLeadId ?? null);
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
          <p className="text-lg text-slate-600 mt-1">
            {String(lead.phone ?? "")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(lead.status as string) === "ancien_documents_recus" ? (
            <span className="inline-flex px-5 py-3 rounded-lg text-base font-medium bg-slate-500 text-white">
              {LEAD_STATUS_LABELS.ancien_documents_recus}
            </span>
          ) : (
            LEAD_STATUSES_TELEPRO.map((s) => (
              <StatusButton
                key={s}
                status={s}
                currentStatus={lead.status as LeadStatus}
                initialCallbackAt={lead.callback_at as string | null | undefined}
                onSelect={(callbackAt) => handleStatusChange(s, callbackAt)}
                disabled={saving}
              />
            ))
          )}
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
