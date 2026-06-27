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
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Appels (période)
        </h2>
        <p className="text-4xl font-bold text-blue-600">{callsInPeriod}</p>
        <p className="text-sm text-slate-500 mt-1">
          Actions enregistrées sur la période (modifications de leads)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camembert statuts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Répartition des leads par statut
            </h2>
            <p className="text-sm text-slate-500 mt-1">
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
              <div className="h-[400px] flex items-center justify-center text-slate-400">
                Aucun lead
              </div>
            )}
          </div>
        </div>

        {/* Camembert types d'installation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">
              Types d&apos;installation (documents reçus)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
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
              <div className="h-[400px] flex items-center justify-center text-slate-400">
                Aucun dossier documents reçus
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-medium text-slate-800">Détail par statut</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {statusData.length > 0 ? (
              statusData.map((item, i) => (
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
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-medium text-slate-800">{item.value}</span>
                    <span className="text-sm text-slate-500 w-12 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-slate-400">
                Aucune donnée
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-medium text-slate-800">
              Détail par type d&apos;installation
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {installationData.length > 0 ? (
              installationData.map((item, i) => (
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
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-medium text-slate-800">{item.value}</span>
                    <span className="text-sm text-slate-500 w-12 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-slate-400">
                Aucune donnée
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
