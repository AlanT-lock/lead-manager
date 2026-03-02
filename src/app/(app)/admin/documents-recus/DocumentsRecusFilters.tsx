"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { DELEGATAIRE_GROUPS, CHANTIER_STATUS_FIELDS } from "@/lib/types";

export function DocumentsRecusFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  const selectedDelegataires = searchParams.getAll("delegataire");
  const currentChantier = searchParams.get("chantier") || "";

  const buildParams = (overrides?: { delegataires?: string[]; chantier?: string; q?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    const delegataires = overrides?.delegataires ?? selectedDelegataires;
    const c = overrides?.chantier ?? currentChantier;
    const q = overrides?.q ?? search.trim();
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    delegataires.forEach((d) => params.append("delegataire", d));
    if (c) params.set("chantier", c);
    if (q) params.set("q", q);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    return params;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/documents-recus?${buildParams().toString()}`);
  };

  const handleDelegataireToggle = (delegataire: string) => {
    const newSelection = selectedDelegataires.includes(delegataire)
      ? selectedDelegataires.filter((d) => d !== delegataire)
      : [...selectedDelegataires, delegataire];
    router.push(`/admin/documents-recus?${buildParams({ delegataires: newSelection }).toString()}`);
  };

  const handleChantierChange = (chantier: string) => {
    router.push(`/admin/documents-recus?${buildParams({ chantier }).toString()}`);
  };

  const handleDateApply = () => {
    router.push(`/admin/documents-recus?${buildParams().toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom ou téléphone..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Rechercher
        </button>
      </form>
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-slate-700">Mandataire :</span>
        {DELEGATAIRE_GROUPS.map((d) => (
          <label key={d} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedDelegataires.includes(d)}
              onChange={() => handleDelegataireToggle(d)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">{d}</span>
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedDelegataires.includes("__non_assigne__")}
            onChange={() => handleDelegataireToggle("__non_assigne__")}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Non assigné</span>
        </label>
        <select
          value={currentChantier}
          onChange={(e) => handleChantierChange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Statut chantier</option>
          {CHANTIER_STATUS_FIELDS.map(({ field, label }) => (
            <option key={field} value={field}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-slate-600 mb-1">Du</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Au</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <button
          type="button"
          onClick={handleDateApply}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          Appliquer dates
        </button>
      </div>
    </div>
  );
}
