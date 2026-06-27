"use client";

import Link from "next/link";

interface StatusRowProps {
  label: string;
  count: number;
  href: string;
  isLast?: boolean;
}

export function StatusRow({ label, count, href, isLast }: StatusRowProps) {
  return (
    <Link
      href={href}
      className={`flex justify-between items-center py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span className="text-slate-700">{label}</span>
      <span className="font-medium text-slate-800">{count}</span>
    </Link>
  );
}
