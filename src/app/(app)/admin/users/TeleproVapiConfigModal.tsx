"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TeleproVapiConfigModalProps {
  teleproId: string;
  teleproName: string;
  onClose: () => void;
}

export function TeleproVapiConfigModal({
  teleproId,
  teleproName,
  onClose,
}: TeleproVapiConfigModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState("");
  const [vapiHoldMessage, setVapiHoldMessage] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<{ ok: boolean; message?: string; assistantId?: string; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSetupResult(null);
    (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/telepro/${teleproId}/vapi-config`, {
        credentials: "include",
      });
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors du chargement");
        return;
      }
      const data = await res.json();
      setPhone(data.phone ?? "");
      setVapiAssistantId(data.vapi_assistant_id ?? "");
      setVapiPhoneNumberId(data.vapi_phone_number_id ?? "");
      setVapiHoldMessage(data.vapi_hold_message ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [teleproId]);

  const handleSetupAssistant = async () => {
    setSetupResult(null);
    setSetupLoading(true);
    try {
      const res = await fetch(`/api/admin/telepro/${teleproId}/vapi-setup-assistant`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSetupResult({ ok: true, message: data.message, assistantId: data.assistantId });
        if (data.assistantId) setVapiAssistantId(data.assistantId);
        router.refresh();
      } else {
        setSetupResult({ ok: false, error: data.error || "Erreur lors du setup" });
      }
    } catch {
      setSetupResult({ ok: false, error: "Erreur réseau" });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/telepro/${teleproId}/vapi-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phone: phone || null,
        vapi_assistant_id: vapiAssistantId || null,
        vapi_phone_number_id: vapiPhoneNumberId || null,
        vapi_hold_message: vapiHoldMessage || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement");
      return;
    }
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            Agent IA & numéro — {teleproName}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Numéro du télépro (où l'appeler) et configuration Vapi pour les appels NRP.
          </p>

          {loading ? (
            <p className="text-slate-500">Chargement…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numéro de téléphone du télépro
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33612345678"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Numéro sur lequel le télépro sera appelé quand un lead NRP décroche.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="block text-sm font-medium text-slate-700">
                    ID assistant Vapi
                  </label>
                  <button
                    type="button"
                    onClick={handleSetupAssistant}
                    disabled={setupLoading}
                    className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {setupLoading ? "Configuration…" : "Configurer l'assistant Vapi"}
                  </button>
                </div>
                <input
                  type="text"
                  value={vapiAssistantId}
                  onChange={(e) => setVapiAssistantId(e.target.value)}
                  placeholder="Ex: asst_xxx (ou créez-le avec le bouton ci-dessus)"
                  className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {setupResult && (
                  <p className={`mt-1 text-sm ${setupResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                    {setupResult.ok ? setupResult.message : setupResult.error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID numéro Vapi (Twilio)
                </label>
                <input
                  type="text"
                  value={vapiPhoneNumberId}
                  onChange={(e) => setVapiPhoneNumberId(e.target.value)}
                  placeholder="Ex: phn_xxx"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Numéro Twilio configuré dans Vapi pour ce télépro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message d&apos;attente (lu au lead pendant que le télépro décroche)
                </label>
                <textarea
                  value={vapiHoldMessage}
                  onChange={(e) => setVapiHoldMessage(e.target.value)}
                  rows={3}
                  placeholder="Un instant, nous vous mettons en relation avec un conseiller..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
