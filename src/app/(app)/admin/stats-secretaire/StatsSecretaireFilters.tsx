"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DELEGATAIRE_GROUPS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StatsSecretaireFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const selectedDelegataires = searchParams.getAll("delegataire");

  const handleApply = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    selectedDelegataires.forEach((d) => params.append("delegataire", d));
    router.push(`/admin/stats-secretaire?${params.toString()}`);
  };

  const handleDelegataireToggle = (delegataire: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const newSelection = selectedDelegataires.includes(delegataire)
      ? selectedDelegataires.filter((d) => d !== delegataire)
      : [...selectedDelegataires, delegataire];
    newSelection.forEach((d) => params.append("delegataire", d));
    router.push(`/admin/stats-secretaire?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-xs font-medium text-[#0b1f3a] mb-2">
          Mandataire (plusieurs possibles)
        </label>
        <div className="flex flex-wrap gap-3">
          {DELEGATAIRE_GROUPS.map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDelegataires.includes(d)}
                onChange={() => handleDelegataireToggle(d)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-[#64748b]">{d}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedDelegataires.includes("__non_assigne__")}
              onChange={() => handleDelegataireToggle("__non_assigne__")}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-[#64748b]">Non assigné</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0b1f3a] mb-1">
          Du
        </label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0b1f3a] mb-1">
          Au
        </label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-[160px]"
        />
      </div>
      <Button onClick={handleApply} size="sm">
        Appliquer
      </Button>
    </div>
  );
}
