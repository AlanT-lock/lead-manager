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
      className={`rounded-[12px] border p-5 transition-all shadow-[0_1px_2px_rgba(13,38,76,.06)] ${
        highlight
          ? "bg-[#f0fdf4] border-[#bbf7d0]"
          : "bg-white border-[#e1e8f2]"
      } ${href ? "hover:shadow-md hover:border-[#bfdbfe] cursor-pointer" : ""}`}
    >
      <p className="text-xs font-medium text-[#64748b]">{label}</p>
      <p
        className={`text-2xl font-extrabold mt-1 ${
          highlight ? "text-[#15803d]" : "text-[#0b1f3a]"
        }`}
      >
        {value}
      </p>
      {href && (
        <p className="text-xs text-[#2563eb] mt-2">Voir les dossiers →</p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
