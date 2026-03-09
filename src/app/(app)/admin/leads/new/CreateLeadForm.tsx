"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LEAD_COLOR_LABELS,
  INSTALLATION_TYPE_LABELS,
  ELECTRICITY_TYPE_LABELS,
  HEATING_MODE_LABELS,
  RADIATOR_TYPE_LABELS,
  RADIATOR_TYPE_OPTIONS,
  type LeadColor,
  type InstallationType,
  type ElectricityType,
  type HeatingMode,
} from "@/lib/types";
import { usePostalCodeToCity } from "@/hooks/usePostalCodeToCity";

interface Telepro {
  id: string;
  full_name?: string | null;
  email: string;
}

interface CreateLeadFormProps {
  telepros: Telepro[];
}

export function CreateLeadForm({ telepros }: CreateLeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    assigned_to: "",
    address: "",
    postal_code: "",
    city: "",
    surface_m2: "",
    revenu_fiscal_ref: "",
    numero_fiscal: "",
    date_of_birth: "",
    heating_mode: "",
    color: "",
    is_owner: "",
    installation_type: "",
    electricity_type: "",
    radiator_type: [] as string[],
    commentaire: "",
  });

  const update = (field: string, value: string | string[]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  };

  const { fetchCity, isLoading: cityLoading } = usePostalCodeToCity(
    form.postal_code,
    (city) => update("city", city)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError("Prénom, nom et téléphone sont requis.");
      return;
    }
    if (!form.assigned_to) {
      setError("Veuillez sélectionner un télépro.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/admin/create-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        surface_m2: form.surface_m2 ? parseFloat(form.surface_m2) : null,
        revenu_fiscal_ref: form.revenu_fiscal_ref ? parseFloat(form.revenu_fiscal_ref) : null,
        numero_fiscal: form.numero_fiscal?.trim() || null,
        date_of_birth: form.date_of_birth?.trim() || null,
        is_owner: form.is_owner === "" ? null : form.is_owner === "owner",
        radiator_type: Array.isArray(form.radiator_type) && form.radiator_type.length > 0 ? form.radiator_type : null,
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création");
      return;
    }
    router.push(`/admin/leads/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/leads"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Retour aux leads
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <h1 className="text-xl font-bold text-slate-800">Nouveau lead</h1>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <h2 className="font-medium text-slate-800 mb-4">Télépro assigné *</h2>
          <select
            value={form.assigned_to}
            onChange={(e) => update("assigned_to", e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            required
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
          <h2 className="font-medium text-slate-800 mb-4">Coordonnées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Prénom *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nom *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Téléphone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
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
                value={form.surface_m2}
                onChange={(e) => update("surface_m2", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Revenu fiscal de référence</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.revenu_fiscal_ref}
                onChange={(e) => update("revenu_fiscal_ref", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Numéro fiscal</label>
              <input
                type="text"
                value={form.numero_fiscal}
                onChange={(e) => update("numero_fiscal", e.target.value)}
                placeholder="13 chiffres"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date de naissance</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Code postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={(e) => update("postal_code", e.target.value)}
                onBlur={fetchCity}
                placeholder="75001"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder={cityLoading ? "Chargement…" : undefined}
                readOnly={cityLoading}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Adresse postale</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Mode chauffage</label>
              <select
                value={form.heating_mode}
                onChange={(e) => update("heating_mode", e.target.value)}
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
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
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
              <label className="block text-sm text-slate-600 mb-1">Propriétaire / Locataire</label>
              <select
                value={form.is_owner}
                onChange={(e) => update("is_owner", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">—</option>
                <option value="owner">Propriétaire</option>
                <option value="tenant">Locataire</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type d&apos;installation</label>
              <select
                value={form.installation_type}
                onChange={(e) => update("installation_type", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">—</option>
                {(Object.keys(INSTALLATION_TYPE_LABELS) as InstallationType[]).map((t) => (
                  <option key={t} value={t}>
                    {INSTALLATION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type d&apos;électricité</label>
              <select
                value={form.electricity_type}
                onChange={(e) => update("electricity_type", e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">—</option>
                {(Object.keys(ELECTRICITY_TYPE_LABELS) as ElectricityType[]).map((t) => (
                  <option key={t} value={t}>
                    {ELECTRICITY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Type de radiateur</label>
              <div className="flex flex-wrap gap-4">
                {RADIATOR_TYPE_OPTIONS.map((t) => {
                  const current = form.radiator_type ?? [];
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
                          update("radiator_type", next);
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
          <label className="block text-sm text-slate-600 mb-1">Commentaire</label>
          <textarea
            value={form.commentaire}
            onChange={(e) => update("commentaire", e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer le lead"}
        </button>
      </div>
    </form>
  );
}
