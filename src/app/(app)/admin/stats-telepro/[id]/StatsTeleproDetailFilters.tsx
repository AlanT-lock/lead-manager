"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function StatsTeleproDetailFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const setPeriod = (fromDate: Date, toDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", toDateStr(fromDate));
    params.set("to", toDateStr(toDate));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
  };

  const now = new Date();

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPeriod(startOfDay(now), endOfDay(now))}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
        >
          Jour
        </button>
        <button
          type="button"
          onClick={() => setPeriod(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }))}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
        >
          Semaine
        </button>
        <button
          type="button"
          onClick={() => setPeriod(startOfMonth(now), endOfMonth(now))}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
        >
          Mois
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Du</label>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("from", e.target.value);
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Au</label>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("to", e.target.value);
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        />
      </div>
      <button
        type="button"
        onClick={handleApply}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Appliquer
      </button>
    </div>
  );
}
