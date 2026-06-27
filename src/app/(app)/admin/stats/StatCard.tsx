"use client";

import Link from "next/link";

interface StatCardProps {
  label: string;
  value: string | number;
  href?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, href, highlight }: StatCardProps) {
  const content = (
    <div
      className={`rounded-xl border p-6 shadow-sm transition-all ${
        highlight
          ? "bg-emerald-50 border-emerald-200"
          : "bg-white border-slate-200"
      } ${href ? "hover:shadow-md hover:border-blue-300 cursor-pointer" : ""}`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          highlight ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {value}
      </p>
      {href && (
        <p className="text-xs text-blue-600 mt-2">Cliquer pour voir les dossiers →</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
