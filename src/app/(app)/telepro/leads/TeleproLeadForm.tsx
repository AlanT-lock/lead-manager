"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LEAD_STATUS_LABELS,
  LEAD_COLOR_LABELS_SIMPLE,
  INSTALLATION_TYPE_LABELS,
  ELECTRICITY_TYPE_LABELS,
  HEATING_MODE_LABELS,
  RADIATOR_TYPE_LABELS,
  RADIATOR_TYPE_OPTIONS,
  type LeadStatus,
  type LeadColor,
  type InstallationType,
  type ElectricityType,
  type HeatingMode,
} from "@/lib/types";
import {
  toDatetimeLocalValueParis,
  fromDatetimeLocalValueParis,
} from "@/lib/date";
import { TeleproDocumentsSection } from "./TeleproDocumentsSection";

interface TeleproDoc {
  id: string;
  type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
}

interface TeleproLeadFormProps {
  lead: Record<string, unknown>;
  leadId: string;
  /** Documents télépro (taxe foncière, avis d'imposition) - affiche la section upload */
  teleproDocuments?: TeleproDoc[];
  /** En mode téléprospection : ID du lead suivant pour navigation */
  nextLeadId?: string | null;
  /** En mode téléprospection : callback après changement de statut */
  onStatusChangeSuccess?: (nextId: string | null) => void;
  /** En mode téléprospection : callback après NRP */
  onNrpClickSuccess?: (nextId: string | null) => void;
  /** Lien "Retour aux leads" - affiché en mode page */
  showBackToLeads?: boolean;
  /** Lien "Mode téléprospection" - affiché en mode page */
  showTeleprospectionLink?: boolean;
  /** Masquer la section statut (affichée ailleurs, ex. mode téléprospection) */
  hideStatusSection?: boolean;
}

export function TeleproLeadForm({
  lead: initialLead,
  leadId,
  teleproDocuments = [],
  nextLeadId,
  onStatusChangeSuccess,
  onNrpClickSuccess,
  showBackToLeads = false,
  showTeleprospectionLink = false,
  hideStatusSection = false,
}: TeleproLeadFormProps) {
  const [lead, setLead] = useState<Record<string, unknown>>(initialLead);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleFieldChange = (field: string, value: unknown) => {
    setLead((l) => ({ ...l, [field]: value }));
  };

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
      setLead((l) => ({ ...l, ...updates }));
      if (onStatusChangeSuccess) {
        onStatusChangeSuccess(nextLeadId ?? null);
      } else {
        router.refresh();
      }
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
      setLead((l) => ({ ...l, nrp_count: newCount }));
      if (onNrpClickSuccess) {
        onNrpClickSuccess(nextLeadId ?? null);
      } else {
        router.refresh();
      }
    }
  };

  const handleSave = async () => {
    if (!lead || saving) return;
    setSaving(true);

    const res = await fetch(`/api/telepro/lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        first_name: lead.first_name,
        last_name: lead.last_name,
        phone: lead.phone,
        email: lead.email,
        surface_m2: lead.surface_m2,
        revenu_fiscal_ref: lead.revenu_fiscal_ref,
        numero_fiscal: lead.numero_fiscal,
        address: lead.address,
        postal_code: lead.postal_code,
        city: lead.city,
        heating_mode: lead.heating_mode,
        radiator_type: lead.radiator_type,
        color: lead.color,
        is_owner: lead.is_owner,
        installation_type: lead.installation_type,
        electricity_type: lead.electricity_type,
        commentaire: lead.commentaire,
      }),
    });

    setSaving(false);
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      {(showBackToLeads || showTeleprospectionLink) && (
        <div className="flex items-center justify-between">
          {showBackToLeads && (
            <Link
              href="/telepro/leads"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              ← Retour aux leads
            </Link>
          )}
          {showTeleprospectionLink && (
            <Link
              href={`/telepro/teleprospection?lead=${leadId}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Mode téléprospection
            </Link>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h1 className="text-xl font-bold text-slate-800">
          {String(lead.first_name ?? "")} {String(lead.last_name ?? "")}
          {!!lead.is_duplicate && (
            <span className="ml-2 text-sm font-normal text-amber-600">
              (Doublon)
            </span>
          )}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prénom
            </label>
            <input
              type="text"
              value={(lead.first_name as string) || ""}
              onChange={(e) => handleFieldChange("first_name", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom
            </label>
            <input
              type="text"
              value={(lead.last_name as string) || ""}
              onChange={(e) => handleFieldChange("last_name", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              value={(lead.phone as string) || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={(lead.email as string) || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de m²
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={(lead.surface_m2 as number) ?? ""}
              onChange={(e) =>
                handleFieldChange(
                  "surface_m2",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Revenu fiscal de référence
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={(lead.revenu_fiscal_ref as number) ?? ""}
              onChange={(e) =>
                handleFieldChange(
                  "revenu_fiscal_ref",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Numéro fiscal
            </label>
            <input
              type="text"
              value={(lead.numero_fiscal as string) || ""}
              onChange={(e) => handleFieldChange("numero_fiscal", e.target.value || null)}
              placeholder="13 chiffres"
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Code postal
            </label>
            <input
              type="text"
              value={(lead.postal_code as string) || ""}
              onChange={(e) => handleFieldChange("postal_code", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ville
            </label>
            <input
              type="text"
              value={(lead.city as string) || ""}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adresse postale
            </label>
            <input
              type="text"
              value={(lead.address as string) || ""}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mode chauffage
            </label>
            <select
              value={(lead.heating_mode as string) || ""}
              onChange={(e) =>
                handleFieldChange("heating_mode", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            >
              <option value="">—</option>
              {(Object.keys(HEATING_MODE_LABELS) as HeatingMode[]).map((m) => (
                <option key={m} value={m}>
                  {HEATING_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Couleur
            </label>
            <select
              value={(lead.color as string) || ""}
              onChange={(e) =>
                handleFieldChange("color", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            >
              <option value="">—</option>
              {(Object.keys(LEAD_COLOR_LABELS_SIMPLE) as LeadColor[]).map((c) => (
                <option key={c} value={c}>
                  {LEAD_COLOR_LABELS_SIMPLE[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Propriétaire / Locataire
            </label>
            <select
              value={
                lead.is_owner === null
                  ? ""
                  : lead.is_owner
                  ? "owner"
                  : "tenant"
              }
              onChange={(e) =>
                handleFieldChange(
                  "is_owner",
                  e.target.value === ""
                    ? null
                    : e.target.value === "owner"
                )
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            >
              <option value="">—</option>
              <option value="owner">Propriétaire</option>
              <option value="tenant">Locataire</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type d&apos;installation
            </label>
            <select
              value={(lead.installation_type as string) || ""}
              onChange={(e) =>
                handleFieldChange("installation_type", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            >
              <option value="">—</option>
              {(Object.keys(INSTALLATION_TYPE_LABELS) as InstallationType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {INSTALLATION_TYPE_LABELS[t]}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type d&apos;électricité
            </label>
            <select
              value={(lead.electricity_type as string) || ""}
              onChange={(e) =>
                handleFieldChange("electricity_type", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
            >
              <option value="">—</option>
              {(Object.keys(ELECTRICITY_TYPE_LABELS) as ElectricityType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {ELECTRICITY_TYPE_LABELS[t]}
                  </option>
                )
              )}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de radiateur
            </label>
            <div className="flex flex-wrap gap-4">
              {RADIATOR_TYPE_OPTIONS.map((t) => {
                const current = (lead.radiator_type as string[] | null) ?? [];
                const checked = current.includes(t);
                return (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current.filter((x) => x !== t), t]
                          : current.filter((x) => x !== t);
                        handleFieldChange("radiator_type", next.length ? next : null);
                      }}
                      className="rounded border-slate-300"
                    />
                    {RADIATOR_TYPE_LABELS[t]}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Commentaire
          </label>
          <textarea
            value={(lead.commentaire as string) || ""}
            onChange={(e) => handleFieldChange("commentaire", e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg disabled:bg-slate-50"
          />
        </div>

        {!hideStatusSection && (
          <div className="border-t pt-6">
            <h3 className="font-medium text-slate-800 mb-3">Statut</h3>
            <div className="flex flex-wrap gap-2">
                  {(lead.status as string) === "ancien_documents_recus" && (
                    <span className="inline-flex px-4 py-2 rounded-lg text-sm font-medium bg-slate-500 text-white">
                      {LEAD_STATUS_LABELS.ancien_documents_recus}
                    </span>
                  )}
                  {((
                    [
                      "nouveau",
                      "nrp",
                      "a_rappeler",
                      "en_attente_doc",
                      "documents_recus",
                      "annule",
                    ] as LeadStatus[]
                  ).filter((s) => s !== "ancien_documents_recus")).map((s) => (
                    <StatusButton
                      key={s}
                      status={s}
                      currentStatus={lead.status as LeadStatus}
                      initialCallbackAt={lead.callback_at as string | null | undefined}
                      onSelect={(callbackAt) =>
                        handleStatusChange(s, callbackAt)
                      }
                      disabled={saving}
                    />
                  ))}
            </div>
            {(lead.status as string) === "nrp" && (
              <button
                type="button"
                onClick={handleNrpClick}
                disabled={saving}
                className="mt-3 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-sm font-medium"
              >
                Toujours NRP (appelé {(lead.nrp_count as number) || 0} fois)
              </button>
            )}
          </div>
        )}

        <TeleproDocumentsSection
          leadId={leadId}
          documents={teleproDocuments}
        />

        <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
        </div>
      </div>
    </div>
  );
}

function getDefaultCallbackDatetime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  return toDatetimeLocalValueParis(d.toISOString());
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
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={handleSaveCallback}
              disabled={disabled || !callbackAt}
              className="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              OK
            </button>
            {!isAlreadyRappeler && (
              <button
                type="button"
                onClick={() => setShowCallback(false)}
                className="text-slate-500 text-sm hover:text-slate-700"
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
            className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusButtonClass(status, currentStatus === status)}`}
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
      className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusButtonClass(status, currentStatus === status)}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </button>
  );
}
