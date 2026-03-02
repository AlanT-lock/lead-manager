"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_STATUS_LABELS,
  LEAD_COLOR_LABELS,
  INSTALLATION_TYPE_LABELS,
  ELECTRICITY_TYPE_LABELS,
  HEATING_MODE_LABELS,
  RADIATOR_TYPE_LABELS,
  RADIATOR_TYPE_OPTIONS,
  LEAD_COLOR_MPR,
  DELEGATAIRE_GROUPS,
  CHANTIER_STATUS_FIELDS,
  type LeadStatus,
  type LeadColor,
  type InstallationType,
  type ElectricityType,
  type HeatingMode,
} from "@/lib/types";
import { usePostalCodeToCity } from "@/hooks/usePostalCodeToCity";
import {
  toDatetimeLocalValueParis,
  fromDatetimeLocalValueParis,
} from "@/lib/date";
import { MaterialCostSection, type SelectedMaterial } from "./MaterialCostSection";

interface AdminLeadFormProps {
  lead: Record<string, unknown>;
}

function buildUpdates(lead: Record<string, unknown>) {
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    callback_at: lead.status === "a_rappeler" && lead.callback_at ? lead.callback_at : null,
    surface_m2: lead.surface_m2 ? Number(lead.surface_m2) : null,
    revenu_fiscal_ref: lead.revenu_fiscal_ref ? Number(lead.revenu_fiscal_ref) : null,
    numero_fiscal: lead.numero_fiscal || null,
    date_of_birth: lead.date_of_birth || null,
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
    doc_status: lead.doc_status,
    is_installe: lead.is_installe,
    is_depot_mpr: lead.is_depot_mpr,
    is_cee_paye: lead.is_cee_paye,
    is_mpe_paye: lead.is_mpe_paye,
    is_ssc_cee: lead.is_ssc_cee,
    is_pac_cee: lead.is_pac_cee,
    is_code_envoye: lead.is_code_envoye,
    is_depose: lead.is_depose,
    is_controle_veritas: lead.is_controle_veritas,
    is_paye: lead.is_paye,
    is_compte_bloque: lead.is_compte_bloque,
    is_rejete: lead.is_rejete,
    installation_cost: lead.installation_cost ? Number(lead.installation_cost) : null,
    material_cost: lead.material_cost ? Number(lead.material_cost) : null,
    material_cost_comment: lead.material_cost_comment,
    regie_cost: lead.regie_cost ? Number(lead.regie_cost) : 0,
    benefit_cee: lead.benefit_cee ? Number(lead.benefit_cee) : null,
    benefit_mpr: lead.benefit_mpr ? Number(lead.benefit_mpr) : null,
    benefit_apporteur_affaires: lead.benefit_apporteur_affaires ? Number(lead.benefit_apporteur_affaires) : null,
    profitability: lead.profitability ? Number(lead.profitability) : null,
    chantier_comment: lead.chantier_comment,
    delegataire_group: lead.delegataire_group,
    updated_at: new Date().toISOString(),
  };
}

export function AdminLeadForm({ lead: initialLead }: AdminLeadFormProps) {
  const [lead, setLead] = useState(initialLead);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadRef = useRef(lead);
  const materialsRef = useRef<SelectedMaterial[]>([]);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    materialsRef.current = selectedMaterials;
  }, [selectedMaterials]);

  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  useEffect(() => {
    leadRef.current = lead;
  }, [lead]);

  const performSave = useCallback(async () => {
    const updates = buildUpdates(leadRef.current);
    setLoading(true);
    const res = await fetch(`/api/admin/lead/${leadRef.current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      lastSavedRef.current = JSON.stringify(updates);
      const materials = materialsRef.current;
      if (materials.length > 0) {
        await fetch(`/api/admin/leads/${leadRef.current.id}/materials`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ materials }),
        });
      } else {
        await fetch(`/api/admin/leads/${leadRef.current.id}/materials`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ materials: [] }),
        });
      }
      // Ne pas refresh : évite d'écraser les modifications en cours de saisie
    }
    setLoading(false);
  }, []);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const updates = buildUpdates(leadRef.current);
      if (JSON.stringify(updates) !== lastSavedRef.current) {
        performSave();
      }
    }, 1500);
  }, [performSave]);

  useEffect(() => {
    lastSavedRef.current = JSON.stringify(buildUpdates(initialLead));
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const updateField = (field: string, value: unknown) => {
    setLead((l) => ({ ...l, [field]: value }));
    if (field === "color" && value) {
      const mpr = LEAD_COLOR_MPR[value as LeadColor];
      if (mpr > 0) {
        setLead((l) => ({ ...l, benefit_mpr: mpr }));
      }
    }
    scheduleAutoSave();
  };

  usePostalCodeToCity((lead.postal_code as string) || "", (city) =>
    updateField("city", city)
  );

  useEffect(() => {
    const inst = (lead.installation_cost as number) || 0;
    const mat = (lead.material_cost as number) || 0;
    const reg = (lead.regie_cost as number) || 0;
    const cee = (lead.benefit_cee as number) || 0;
    const mpr = (lead.benefit_mpr as number) || 0;
    const profit = cee + mpr - inst - mat - reg;
    setLead((l) => ({ ...l, profitability: profit }));
  }, [
    lead.installation_cost,
    lead.material_cost,
    lead.regie_cost,
    lead.benefit_cee,
    lead.benefit_mpr,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const updates = buildUpdates(lead);
    setLoading(true);
    const res = await fetch(`/api/admin/lead/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    setLoading(false);
    if (res.ok) {
      lastSavedRef.current = JSON.stringify(updates);
      router.refresh();
    }
  };

  const isDocumentsRecus = lead.status === "documents_recus" || lead.status === "ancien_documents_recus";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="font-medium text-slate-800 mb-4">Coordonnées</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Prénom</label>
            <input
              type="text"
              value={(lead.first_name as string) || ""}
              onChange={(e) => updateField("first_name", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nom</label>
            <input
              type="text"
              value={(lead.last_name as string) || ""}
              onChange={(e) => updateField("last_name", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Téléphone</label>
            <input
              type="tel"
              value={(lead.phone as string) || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={(lead.email as string) || ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-medium text-slate-800 mb-4">Statut</h2>
        <select
          value={(lead.status as string) || ""}
          onChange={(e) => updateField("status", e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {lead.status === "a_rappeler" && (
          <div className="mt-2">
            <label className="block text-sm text-slate-600 mb-1">
              Date/heure rappel
            </label>
            <input
              type="datetime-local"
              value={
                lead.callback_at
                  ? toDatetimeLocalValueParis(lead.callback_at as string)
                  : ""
              }
              onChange={(e) => {
                const iso = e.target.value ? fromDatetimeLocalValueParis(e.target.value) : "";
                updateField("callback_at", iso || null);
              }}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="font-medium text-slate-800 mb-4">Adresse</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Nombre de m²</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={(lead.surface_m2 as number) ?? ""}
              onChange={(e) =>
                updateField(
                  "surface_m2",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Revenu fiscal de référence</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={(lead.revenu_fiscal_ref as number) ?? ""}
              onChange={(e) =>
                updateField(
                  "revenu_fiscal_ref",
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Numéro fiscal</label>
            <input
              type="text"
              value={(lead.numero_fiscal as string) || ""}
              onChange={(e) => updateField("numero_fiscal", e.target.value || null)}
              placeholder="13 chiffres"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Date de naissance</label>
            <input
              type="date"
              value={(lead.date_of_birth as string) || ""}
              onChange={(e) => updateField("date_of_birth", e.target.value || null)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Code postal</label>
            <input
              type="text"
              value={(lead.postal_code as string) || ""}
              onChange={(e) => updateField("postal_code", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Ville</label>
            <input
              type="text"
              value={(lead.city as string) || ""}
              onChange={(e) => updateField("city", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-600 mb-1">Adresse</label>
            <input
              type="text"
              value={(lead.address as string) || ""}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Mode chauffage</label>
            <select
              value={(lead.heating_mode as string) || ""}
              onChange={(e) =>
                updateField("heating_mode", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg"
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
            <label className="block text-sm text-slate-600 mb-1">Couleur</label>
            <select
              value={(lead.color as string) || ""}
              onChange={(e) => updateField("color", e.target.value || null)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">—</option>
              {(Object.keys(LEAD_COLOR_LABELS) as LeadColor[]).map((c) => (
                <option key={c} value={c}>
                  {LEAD_COLOR_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
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
                updateField(
                  "is_owner",
                  e.target.value === "" ? null : e.target.value === "owner"
                )
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">—</option>
              <option value="owner">Propriétaire</option>
              <option value="tenant">Locataire</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              Type installation
            </label>
            <select
              value={(lead.installation_type as string) || ""}
              onChange={(e) =>
                updateField("installation_type", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg"
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
            <label className="block text-sm text-slate-600 mb-1">
              Type d&apos;électricité
            </label>
            <select
              value={(lead.electricity_type as string) || ""}
              onChange={(e) =>
                updateField("electricity_type", e.target.value || null)
              }
              className="w-full px-4 py-2 border rounded-lg"
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
            <label className="block text-sm text-slate-600 mb-1">
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
                        updateField("radiator_type", next.length ? next : null);
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
      </div>

      <div>
        <h2 className="font-medium text-slate-800 mb-4">Commentaire</h2>
        <textarea
          value={(lead.commentaire as string) || ""}
          onChange={(e) => updateField("commentaire", e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {isDocumentsRecus && (
        <>
          <div>
            <h2 className="font-medium text-slate-800 mb-4">
              Statut chantier (cumulables)
            </h2>
            <div className="flex flex-wrap gap-4">
              {CHANTIER_STATUS_FIELDS.map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!(lead[field as keyof typeof lead] as boolean)}
                    onChange={(e) => updateField(field, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-medium text-slate-800 mb-4">Finances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Coût installation (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(lead.installation_cost as number) || ""}
                  onChange={(e) =>
                    updateField(
                      "installation_cost",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <MaterialCostSection
                  leadId={lead.id as string}
                  materialCost={(lead.material_cost as number) ?? null}
                  materialCostComment={(lead.material_cost_comment as string) || ""}
                  onMaterialCostChange={(v) => updateField("material_cost", v)}
                  onMaterialCostCommentChange={(v) =>
                    updateField("material_cost_comment", v)
                  }
                  onMaterialsChange={setSelectedMaterials}
                  selectedMaterials={selectedMaterials}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Coût régie (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(lead.regie_cost as number) ?? 0}
                  onChange={(e) =>
                    updateField(
                      "regie_cost",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Bénéfice CEE (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(lead.benefit_cee as number) || ""}
                  onChange={(e) =>
                    updateField(
                      "benefit_cee",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Bénéfice MPR (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(lead.benefit_mpr as number) || ""}
                  onChange={(e) =>
                    updateField(
                      "benefit_mpr",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Bénéfice apporteur d&apos;affaires (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(lead.benefit_apporteur_affaires as number) || ""}
                  onChange={(e) =>
                    updateField(
                      "benefit_apporteur_affaires",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Rentabilité (€) - auto
                </label>
                <input
                  type="text"
                  value={(lead.profitability as number)?.toFixed(2) ?? ""}
                  readOnly
                  className="w-full px-4 py-2 border rounded-lg bg-slate-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">
                  Commentaire chantier
                </label>
                <textarea
                  value={(lead.chantier_comment as string) || ""}
                  onChange={(e) =>
                    updateField("chantier_comment", e.target.value)
                  }
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">
                  Groupe délégataire
                </label>
                <select
                  value={(lead.delegataire_group as string) || ""}
                  onChange={(e) =>
                    updateField("delegataire_group", e.target.value || null)
                  }
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">—</option>
                  {DELEGATAIRE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
