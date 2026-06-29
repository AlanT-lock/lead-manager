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
      className={`flex justify-between items-center py-3 px-2 -mx-2 rounded-lg hover:bg-[#f8fafc] transition-colors ${
        !isLast ? "border-b border-[#f1f5f9]" : ""
      }`}
    >
      <span className="text-[#64748b]">{label}</span>
      <span className="font-semibold text-[#0b1f3a]">{count}</span>
    </Link>
  );
}
