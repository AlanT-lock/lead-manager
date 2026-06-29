"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { STATUS_CHART_COLORS, INSTALLATION_CHART_COLORS, type LeadStatus, type InstallationType } from "@/lib/types";

const FALLBACK_COLOR = "#94a3b8";

interface StatusItem {
  name: string;
  value: number;
  status: string;
  percent: number;
}

interface InstallationItem {
  name: string;
  value: number;
  type: string;
  percent: number;
}

interface TeleproStatsClientProps {
  callsInPeriod: number;
  statusData: StatusItem[];
  installationData: InstallationItem[];
  totalLeads: number;
  totalWithInstallation: number;
}

export function TeleproStatsClient({
  callsInPeriod,
  statusData,
  installationData,
  totalLeads,
  totalWithInstallation,
}: TeleproStatsClientProps) {
  return (
    <div className="space-y-8">
      {/* Appels de la période */}
      <div className="rounded-[12px] border border-[#e1e8f2] bg-[#eff6ff] p-8 shadow-[0_1px_2px_rgba(13,38,76,.06)]">
        <h2 className="text-lg font-semibold text-[#0b1f3a] mb-2">
          Appels (période)
        </h2>
        <p className="text-4xl font-extrabold text-[#2563eb]">{callsInPeriod}</p>
        <p className="text-sm text-[#64748b] mt-1">
          Actions enregistrées sur la période (modifications de leads)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camembert statuts */}
        <div className="bg-white rounded-[12px] border border-[#e1e8f2] shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
          <div className="p-6 border-b border-[#f1f5f9]">
            <h2 className="text-lg font-semibold text-[#0b1f3a]">
              Répartition des leads par statut
            </h2>
            <p className="text-sm text-[#64748b] mt-1">
              Total : {totalLeads} leads • En %
            </p>
          </div>
          <div className="p-6">
            {statusData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={({ name, percent }) =>
                        `${name} (${percent}%)`
                      }
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-[#94a3b8]">
                Aucun lead
              </div>
            )}
          </div>
        </div>

        {/* Camembert types d'installation */}
        <div className="bg-white rounded-[12px] border border-[#e1e8f2] shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
          <div className="p-6 border-b border-[#f1f5f9]">
            <h2 className="text-lg font-semibold text-[#0b1f3a]">
              Types d&apos;installation (documents reçus)
            </h2>
            <p className="text-sm text-[#64748b] mt-1">
              Total : {totalWithInstallation} dossiers • En %
            </p>
          </div>
          <div className="p-6">
            {installationData.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={installationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={({ name, percent }) =>
                        `${name} (${percent}%)`
                      }
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-[#94a3b8]">
                Aucun dossier documents reçus
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[12px] border border-[#e1e8f2] shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
          <div className="p-4 bg-[#f8fafc] border-b border-[#e1e8f2]">
            <h3 className="font-semibold text-[#0b1f3a]">Détail par statut</h3>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {statusData.length > 0 ? (
              statusData.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          item.status && item.status in STATUS_CHART_COLORS
                            ? STATUS_CHART_COLORS[item.status as LeadStatus]
                            : FALLBACK_COLOR,
                      }}
                    />
                    <span className="text-[#64748b]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-[#0b1f3a]">{item.value}</span>
                    <span className="text-sm text-[#94a3b8] w-12 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-[#94a3b8]">
                Aucune donnée
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e1e8f2] shadow-[0_1px_2px_rgba(13,38,76,.06)] overflow-hidden">
          <div className="p-4 bg-[#f8fafc] border-b border-[#e1e8f2]">
            <h3 className="font-semibold text-[#0b1f3a]">
              Détail par type d&apos;installation
            </h3>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {installationData.length > 0 ? (
              installationData.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          item.type && item.type in INSTALLATION_CHART_COLORS
                            ? INSTALLATION_CHART_COLORS[item.type as InstallationType]
                            : FALLBACK_COLOR,
                      }}
                    />
                    <span className="text-[#64748b]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-[#0b1f3a]">{item.value}</span>
                    <span className="text-sm text-[#94a3b8] w-12 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-[#94a3b8]">
                Aucune donnée
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
