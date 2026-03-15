"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_DURATION_MS = 120000;

export function NrpCallsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setPolling(false);
  }, []);

  const pollPendingLead = useCallback(() => {
    if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
      stopPolling();
      return;
    }
    fetch("/api/telepro/pending-lead", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.leadId) {
          stopPolling();
          router.push(`/telepro/leads/${data.leadId}`);
          return;
        }
        pollTimeoutRef.current = setTimeout(pollPendingLead, POLL_INTERVAL_MS);
      })
      .catch(() => {
        pollTimeoutRef.current = setTimeout(pollPendingLead, POLL_INTERVAL_MS);
      });
  }, [router, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleStartCalls = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/telepro/nrp-calls/start", {
        method: "POST",
        credentials: "include",
      });
      const raw = await res.text();
      const data = (() => {
        try {
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      })();
      if (!res.ok) {
        const msg = data?.error ?? `Erreur ${res.status} lors du lancement des appels`;
        setError(msg);
        if (process.env.NODE_ENV === "development") {
          console.error("[nrp-calls-start] API error:", res.status, raw);
        }
        return;
      }
      setSuccess(data.message || "Appels lancés.");
      pollStartRef.current = Date.now();
      setPolling(true);
      pollPendingLead();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur réseau";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleStartCalls}
        disabled={loading || polling}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Phone className="w-4 h-4" />
        {loading
          ? "Lancement…"
          : polling
            ? "En attente d’un décrochage…"
            : "Lancer les appels NRP (2 numéros)"}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && !error && (
        <p className="text-sm text-slate-600">{success}</p>
      )}
    </div>
  );
}
