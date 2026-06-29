export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#e1e8f2] bg-white p-4 shadow-[0_1px_2px_rgba(13,38,76,.06)]">
      <div className="text-xs font-medium text-[#64748b]">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[#0b1f3a]">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-[#64748b]">{hint}</div> : null}
    </div>
  );
}
