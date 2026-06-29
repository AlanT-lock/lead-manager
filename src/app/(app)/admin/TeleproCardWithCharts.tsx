"use client";

import Link from "next/link";
import { User, ChevronRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { STATUS_CHART_COLORS, INSTALLATION_CHART_COLORS, type LeadStatus, type InstallationType } from "@/lib/types";
import { StatCard } from "@/components/ui-kit/StatCard";

interface StatusItem {
  name: string;
  value: number;
  percent: number;
  status?: LeadStatus;
}

interface InstallationItem {
  name: string;
  value: number;
  percent: number;
  type?: string;
}

interface TeleproCardWithChartsProps {
  id: string;
  fullName: string | null;
  email: string;
  callsCount?: number;
  statusData: StatusItem[];
  installationData: InstallationItem[];
  dateFrom?: string;
  dateTo?: string;
}

const FALLBACK_COLOR = "#94a3b8";

export function TeleproCardWithCharts({
  id,
  fullName,
  email,
  callsCount = 0,
  statusData,
  installationData,
  dateFrom,
  dateTo,
}: TeleproCardWithChartsProps) {
  const query = [dateFrom && `from=${dateFrom}`, dateTo && `to=${dateTo}`].filter(Boolean).join("&");
  const href = `/admin/stats-telepro/${id}${query ? `?${query}` : ""}`;
  return (
    <Link
      href={href}
      className="group block p-6 rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] hover:shadow-md hover:border-[#bfdbfe] transition-all"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0b1f3a] truncate">
            {fullName || email}
          </p>
          <p className="text-sm text-[#64748b] truncate">{email}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#2563eb] shrink-0" />
      </div>

      <div className="mb-4">
        <StatCard label="Appels (période)" value={callsCount} />
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-h-[200px]">
          <p className="text-xs font-medium text-[#64748b] mb-2">
            Statuts
          </p>
          {statusData.length > 0 ? (
            <div className="rounded-[12px] border border-[#e1e8f2] bg-[#f8fafc] p-2 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ percent }) => `${percent}%`}
                  >
                    {statusData.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          item.status && item.status in STATUS_CHART_COLORS
                            ? STATUS_CHART_COLORS[item.status as LeadStatus]
                            : FALLBACK_COLOR
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} (${(props?.payload as { percent?: number })?.percent ?? 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center rounded-[12px] border border-[#e1e8f2] bg-[#f8fafc] text-[#94a3b8] text-sm">
              Aucun lead
            </div>
          )}
        </div>
        <div className="min-h-[200px]">
          <p className="text-xs font-medium text-[#64748b] mb-2">
            Types d&apos;installation
          </p>
          {installationData.length > 0 ? (
            <div className="rounded-[12px] border border-[#e1e8f2] bg-[#f8fafc] p-2 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={installationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ percent }) => `${percent}%`}
                  >
                    {installationData.map((item, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          item.type && item.type in INSTALLATION_CHART_COLORS
                            ? INSTALLATION_CHART_COLORS[item.type as InstallationType]
                            : FALLBACK_COLOR
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} (${(props?.payload as { percent?: number })?.percent ?? 0}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center rounded-[12px] border border-[#e1e8f2] bg-[#f8fafc] text-[#94a3b8] text-sm">
              Aucun doc reçu
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
