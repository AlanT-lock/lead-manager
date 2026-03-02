"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, CHANTIER_STATUS_FIELDS, DELEGATAIRE_GROUPS } from "@/lib/types";

interface Telepro {
  id: string;
  full_name?: string | null;
  email: string;
  label?: string;
}

interface AdminLeadsFiltersProps {
  basePath?: string;
  telepros?: Telepro[];
}

export function AdminLeadsFilters({ basePath = "/admin/leads", telepros = [] }: AdminLeadsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const currentStatus = searchParams.get("status") || "";
  const currentTelepro = searchParams.get("telepro") || "";
  const currentChantier = searchParams.get("chantier") || "";
  const currentDelegataire = searchParams.get("delegataire") || "";
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  // Synchroniser les états locaux avec l'URL quand les params changent (ex: clic sur sous-catégorie dans le menu)
  const urlQ = searchParams.get("q") || "";
  const urlFrom = searchParams.get("from") || "";
  const urlTo = searchParams.get("to") || "";
  useEffect(() => {
    setSearch(urlQ);
    setFrom(urlFrom);
    setTo(urlTo);
  }, [urlQ, urlFrom, urlTo]);

  const buildParams = useCallback((overrides?: { status?: string; telepro?: string; chantier?: string; delegataire?: string; q?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    const s = overrides?.status ?? currentStatus;
    const t = overrides?.telepro ?? currentTelepro;
    const c = overrides?.chantier ?? currentChantier;
    const d = overrides?.delegataire ?? currentDelegataire;
    const q = overrides?.q ?? search.trim();
    const f = overrides?.from ?? from;
    const toVal = overrides?.to ?? to;
    if (s) params.set("status", s);
    if (t) params.set("telepro", t);
    if (c) params.set("chantier", c);
    if (d) params.set("delegataire", d);
    if (q) params.set("q", q);
    if (f) params.set("from", f);
    if (toVal) params.set("to", toVal);
    return params;
  }, [currentStatus, currentTelepro, currentChantier, currentDelegataire, search, from, to]);

  // Recherche automatique avec debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = search.trim();
      const currentQ = searchParams.get("q") || "";
      if (q !== currentQ) {
        router.push(`${basePath}?${buildParams({ q }).toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, basePath, router, buildParams, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`${basePath}?${buildParams().toString()}`);
  };

  const handleStatusChange = (status: string) => {
    router.push(`${basePath}?${buildParams({ status }).toString()}`);
  };

  const handleTeleproChange = (teleproId: string) => {
    router.push(`${basePath}?${buildParams({ telepro: teleproId }).toString()}`);
  };

  const handleChantierChange = (chantier: string) => {
    router.push(`${basePath}?${buildParams({ chantier }).toString()}`);
  };

  const handleDateApply = () => {
    router.push(`${basePath}?${buildParams().toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="w-full flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom, téléphone ou email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0"
        >
          Rechercher
        </button>
      </form>
      {basePath === "/admin/leads" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Statut</label>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              {LEAD_STATUSES_ADMIN.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Télépro</label>
            <select
              value={currentTelepro}
              onChange={(e) => handleTeleproChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les télépros</option>
              {telepros.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label ?? t.full_name ?? t.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Chantier</label>
            <select
              value={currentChantier}
              onChange={(e) => handleChantierChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Statut chantier</option>
              {CHANTIER_STATUS_FIELDS.map(({ field, label }) => (
                <option key={field} value={field}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Mandataire</label>
            <select
              value={currentDelegataire}
              onChange={(e) => router.push(`${basePath}?${buildParams({ delegataire: e.target.value }).toString()}`)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les mandataires</option>
              {DELEGATAIRE_GROUPS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value="__non_assigne__">Non assigné</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={handleDateApply}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              Appliquer dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
