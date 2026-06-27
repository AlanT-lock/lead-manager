"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, type LeadStatus } from "@/lib/types";

export function LeadsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const currentStatus = searchParams.get("status") || "";
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const urlQ = searchParams.get("q") || "";
  const urlFrom = searchParams.get("from") || "";
  const urlTo = searchParams.get("to") || "";

  useEffect(() => {
    if (document.activeElement !== searchInputRef.current) {
      setSearch(urlQ);
    }
  }, [urlQ]);

  useEffect(() => {
    setFrom(urlFrom);
    setTo(urlTo);
  }, [urlFrom, urlTo]);

  const buildParams = useCallback((overrides?: { status?: string; q?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    const s = overrides?.status ?? currentStatus;
    const q = overrides?.q ?? search.trim();
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    return params;
  }, [currentStatus, search, from, to]);

  // Recherche automatique avec debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = search.trim();
      const currentQ = searchParams.get("q") || "";
      if (q !== currentQ) {
        router.push(`/telepro/leads?${buildParams({ q }).toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, router, buildParams, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/telepro/leads?${buildParams().toString()}`);
  };

  const handleStatusChange = (status: string) => {
    router.push(`/telepro/leads?${buildParams({ status }).toString()}`);
  };

  const handleDateApply = () => {
    router.push(`/telepro/leads?${buildParams().toString()}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="w-full flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={searchInputRef}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
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
