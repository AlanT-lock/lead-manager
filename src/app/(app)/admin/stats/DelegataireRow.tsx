"use client";

import Link from "next/link";

interface DelegataireRowProps {
  label: string;
  count: number;
  href: string;
  isLast?: boolean;
}

export function DelegataireRow({ label, count, href, isLast }: DelegataireRowProps) {
  return (
    <Link
      href={href}
      className={`flex justify-between items-center py-3 px-2 -mx-2 rounded-lg hover:bg-[#f8fafc] transition-colors ${
        !isLast ? "border-b border-[#f1f5f9]" : "border-t border-[#e1e8f2] mt-2"
      }`}
    >
      <span className="text-[#64748b]">{label}</span>
      <span className="font-semibold text-[#0b1f3a]">{count}</span>
    </Link>
  );
}
