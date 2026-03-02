"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeleproLeadForm } from "../leads/TeleproLeadForm";
import { LeadLogsSidebar, type LogEntry } from "@/components/LeadLogsSidebar";
import { TeleprospectionStatusBar } from "./TeleprospectionStatusBar";

interface TeleproDoc {
  id: string;
  type: string;
  file_name: string;
  storage_path: string;
  created_at: string;
}

interface PreloadedData {
  lead: Record<string, unknown>;
  logs: LogEntry[];
  teleproDocuments: TeleproDoc[];
}

interface TeleprospectionClientProps {
  initialLeadId: string | null;
  leadIds: string[];
}

async function fetchLeadData(id: string): Promise<PreloadedData | null> {
  const [leadRes, logsRes, docsRes] = await Promise.all([
    fetch(`/api/telepro/lead/${id}`, { credentials: "include" }),
    fetch(`/api/telepro/lead/${id}/logs`, { credentials: "include" }),
    fetch(`/api/telepro/lead/${id}/documents`, { credentials: "include" }),
  ]);
  if (!leadRes.ok) return null;
  const leadData = await leadRes.json();
  const logsData = logsRes.ok ? await logsRes.json() : [];
  const docsData = docsRes.ok ? await docsRes.json() : [];
  return { lead: leadData, logs: logsData, teleproDocuments: docsData };
}

export function TeleprospectionClient({
  initialLeadId,
  leadIds,
}: TeleprospectionClientProps) {
  const [leadId, setLeadId] = useState<string | null>(initialLeadId);
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [teleproDocuments, setTeleproDocuments] = useState<TeleproDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preloaded, setPreloaded] = useState<{ id: string; data: PreloadedData } | null>(null);
  const router = useRouter();

  const currentIndex = leadId ? leadIds.indexOf(leadId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < leadIds.length - 1;
  const prevId = hasPrev ? leadIds[currentIndex - 1] : null;
  const nextId = hasNext ? leadIds[currentIndex + 1] : null;

  const preloadNext = useCallback((nextLeadId: string) => {
    fetchLeadData(nextLeadId).then((data) => {
      if (data) setPreloaded({ id: nextLeadId, data });
    });
  }, []);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setLogs([]);
      setTeleproDocuments([]);
      setLoadError(false);
      setLoading(false);
      setPreloaded(null);
      return;
    }

    if (preloaded?.id === leadId) {
      setLead(preloaded.data.lead);
      setLogs(preloaded.data.logs);
      setTeleproDocuments(preloaded.data.teleproDocuments);
      setLoadError(false);
      setLoading(false);
      setPreloaded(null);
      if (nextId) preloadNext(nextId);
      return;
    }

    setLoading(true);
    setLoadError(false);
    setPreloaded(null);
    setLead(null);
    setLogs([]);
    setTeleproDocuments([]);
    fetchLeadData(leadId)
      .then((data) => {
        if (!data) throw new Error("Lead non trouvé");
        setLead(data.lead);
        setLogs(data.logs);
        setTeleproDocuments(data.teleproDocuments);
        setLoadError(false);
        setLoading(false);
        if (nextId) preloadNext(nextId);
      })
      .catch(() => {
        setLead(null);
        setLogs([]);
        setTeleproDocuments([]);
        setLoadError(true);
        setLoading(false);
      });
  }, [leadId, nextId, preloadNext]);

  const handleStatusChangeSuccess = (nextIdToGo: string | null) => {
    if (nextIdToGo) {
      router.push(`/telepro/teleprospection?lead=${nextIdToGo}`);
      setLeadId(nextIdToGo);
    } else {
      router.push("/telepro/teleprospection?done=1");
      setLeadId(null);
    }
  };

  const handleNrpClickSuccess = (nextIdToGo: string | null) => {
    if (nextIdToGo) {
      router.push(`/telepro/teleprospection?lead=${nextIdToGo}`);
      setLeadId(nextIdToGo);
    } else {
      router.push("/telepro/teleprospection?done=1");
      setLeadId(null);
    }
  };

  if (!initialLeadId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Aucun lead à traiter
        </h1>
        <p className="text-slate-600 mb-6">
          Tous vos leads ont été traités ou sont en attente de rappel.
        </p>
        <Link
          href="/telepro"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            Mode téléprospection
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/telepro/leads"
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Liste des leads
            </Link>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              <button
                onClick={() =>
                  prevId && (router.push(`/telepro/teleprospection?lead=${prevId}`), setLeadId(prevId))
                }
                disabled={!hasPrev}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Lead précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                {currentIndex + 1} sur {leadIds.length}
              </span>
              <button
                onClick={() =>
                  nextId && (router.push(`/telepro/teleprospection?lead=${nextId}`), setLeadId(nextId))
                }
                disabled={!hasNext}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Lead suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
            Chargement...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-xl border border-amber-200 p-12 text-center">
            <p className="text-amber-800 font-medium">Impossible de charger ce lead.</p>
            <p className="text-slate-600 text-sm mt-2">
              Vérifiez qu&apos;il vous est bien assigné.
            </p>
          </div>
        ) : lead && leadId && String(lead.id) === leadId ? (
          <div className="flex gap-6 items-start" key={leadId}>
            <div className="flex-1 min-w-0">
              <TeleproLeadForm
                lead={lead}
                leadId={leadId}
                teleproDocuments={teleproDocuments}
                nextLeadId={nextId}
                onStatusChangeSuccess={handleStatusChangeSuccess}
                onNrpClickSuccess={handleNrpClickSuccess}
                hideStatusSection
              />
            </div>
            <div className="w-80 shrink-0 flex flex-col gap-4">
              <LeadLogsSidebar logs={logs} />
              <TeleprospectionStatusBar
                lead={lead}
                leadId={leadId}
                nextLeadId={nextId}
                onStatusChangeSuccess={handleStatusChangeSuccess}
                onNrpClickSuccess={handleNrpClickSuccess}
                onLeadUpdate={(updates) =>
                  setLead((prev) => (prev ? { ...prev, ...updates } : null))
                }
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
            Chargement...
          </div>
        )}
      </div>
  );
}
