"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { LEAD_STATUS_LABELS, LEAD_STATUSES_ADMIN, LEAD_CATEGORIES, LEAD_CATEGORY_LABELS, type LeadStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LeadsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const currentStatus = searchParams.get("status") || "";
  const currentCategory = searchParams.get("category") || "";
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

  const buildParams = useCallback((overrides?: { status?: string; q?: string; from?: string; to?: string; category?: string }) => {
    const params = new URLSearchParams();
    const s = overrides?.status ?? currentStatus;
    const cat = overrides?.category ?? currentCategory;
    const q = overrides?.q ?? search.trim();
    const f = overrides?.from ?? from;
    const t = overrides?.to ?? to;
    if (s) params.set("status", s);
    if (cat) params.set("category", cat);
    if (q) params.set("q", q);
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    // Préservés à travers les changements de filtre : sans eux, changer un filtre
    // ramènerait la taille de page au défaut et perdrait l'ordre choisi.
    const per = searchParams.get("per");
    if (per) params.set("per", per);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const dir = searchParams.get("dir");
    if (dir) params.set("dir", dir);
    // `page` est volontairement omis : changer un filtre ramène en page 1.
    return params;
  }, [currentStatus, search, from, to, currentCategory, searchParams]);

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

  const handleCategoryChange = (category: string) => {
    router.push(`/telepro/leads?${buildParams({ category }).toString()}`);
  };

  const handleDateApply = () => {
    router.push(`/telepro/leads?${buildParams().toString()}`);
  };

  return (
    <div className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] p-4 flex flex-col gap-4">
      <form onSubmit={handleSearch} className="w-full flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
          <Input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom, téléphone ou email..."
            className="pl-9 h-9 border-[#e1e8f2] rounded-[9px] text-[#0b1f3a] placeholder:text-[#64748b]"
            data-testid="filter-search"
          />
        </div>
        <Button type="submit" size="sm" className="h-9 shrink-0">
          Rechercher
        </Button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Catégorie</label>
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full h-9 px-3 py-1.5 text-sm border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
            data-testid="filter-category"
          >
            <option value="">Toutes les catégories</option>
            {LEAD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LEAD_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Statut</label>
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full h-9 px-3 py-1.5 text-sm border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]"
            data-testid="filter-status"
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
          <label className="block text-xs font-medium text-[#64748b] mb-1">Du</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 border-[#e1e8f2] rounded-[9px] text-[#0b1f3a]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748b] mb-1">Au</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 border-[#e1e8f2] rounded-[9px] text-[#0b1f3a]"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleDateApply}
          className="w-full h-9"
        >
          Appliquer dates
        </Button>
      </div>
    </div>
  );
}
