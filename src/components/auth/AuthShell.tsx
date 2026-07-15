import type { ReactNode } from "react";
import Image from "next/image";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f4f7fb]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="RS ÉCOLOGIE" width={1024} height={1024} className="h-14 w-auto object-contain" priority />
        </div>
        <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-8 shadow-[0_10px_30px_rgba(11,31,58,.10)]">
          <h1 className="text-2xl font-bold text-[#0b1f3a]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[#64748b]">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-[#64748b]">{footer}</div> : null}
      </div>
    </div>
  );
}
