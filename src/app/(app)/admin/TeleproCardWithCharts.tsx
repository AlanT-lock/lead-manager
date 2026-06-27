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
      className="group block p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">
            {fullName || email}
          </p>
          <p className="text-sm text-slate-500 truncate">{email}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 shrink-0" />
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs font-medium text-slate-500">Appels (période)</p>
        <p className="text-2xl font-bold text-blue-600">{callsCount}</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="min-h-[200px]">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Statuts
          </p>
          {statusData.length > 0 ? (
            <div className="h-[180px]">
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
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
              Aucun lead
            </div>
          )}
        </div>
        <div className="min-h-[200px]">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Types d&apos;installation
          </p>
          {installationData.length > 0 ? (
            <div className="h-[180px]">
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
            <div className="h-[180px] flex items-center justify-center text-slate-400 text-sm">
              Aucun doc reçu
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
