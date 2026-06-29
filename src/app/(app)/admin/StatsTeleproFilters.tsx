"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function StatsTeleproFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const setPeriod = (fromDate: Date, toDate: Date) => {
    const params = new URLSearchParams();
    params.set("from", toDateStr(fromDate));
    params.set("to", toDateStr(toDate));
    router.push(`/admin?${params.toString()}`);
  };

  const handleApply = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin?${params.toString()}`);
  };

  const now = new Date();

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPeriod(startOfDay(now), endOfDay(now))}
        >
          Jour
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPeriod(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }))}
        >
          Semaine
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPeriod(startOfMonth(now), endOfMonth(now))}
        >
          Mois
        </Button>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0b1f3a] mb-1">Du</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("from", e.target.value);
            router.push(`/admin?${params.toString()}`);
          }}
          className="w-[160px]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#0b1f3a] mb-1">Au</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("to", e.target.value);
            router.push(`/admin?${params.toString()}`);
          }}
          className="w-[160px]"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleApply}
      >
        Appliquer
      </Button>
    </div>
  );
}
