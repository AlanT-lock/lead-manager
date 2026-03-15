"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface VoiceOption {
  value: string;
  label: string;
}

interface TeleproAgentConfigFormProps {
  teleproId: string;
  teleproName: string;
  initial: {
    phone: string;
    vapi_phone_number_id: string;
    vapi_hold_message: string;
    vapi_voice_id: string;
    first_message_audio_url: string;
  };
  voiceOptions: readonly VoiceOption[];
}

export function TeleproAgentConfigForm({
  teleproId,
  initial,
  voiceOptions,
}: TeleproAgentConfigFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial.phone);
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState(initial.vapi_phone_number_id);
  const [vapiHoldMessage, setVapiHoldMessage] = useState(initial.vapi_hold_message);
  const [vapiVoiceId, setVapiVoiceId] = useState(initial.vapi_voice_id);
  const [firstMessageAudioUrl, setFirstMessageAudioUrl] = useState(initial.first_message_audio_url);
  const [saving, setSaving] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    const res = await fetch(`/api/admin/telepro/${teleproId}/vapi-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        phone: phone || null,
        vapi_phone_number_id: vapiPhoneNumberId || null,
        vapi_hold_message: vapiHoldMessage || null,
        vapi_voice_id: vapiVoiceId || null,
        first_message_audio_url: firstMessageAudioUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement");
      return;
    }
    setSuccess("Enregistré.");
    router.refresh();
  };

  const handleSetupAssistant = async () => {
    setSetupResult(null);
    setError(null);
    setSetupLoading(true);
    try {
      const res = await fetch(`/api/admin/telepro/${teleproId}/vapi-setup-assistant`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSetupResult(data.message || "Assistant configuré.");
        router.refresh();
      } else {
        setSetupResult(null);
        setError(data.error || "Erreur lors du setup");
      }
    } finally {
      setSetupLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch(`/api/admin/telepro/${teleproId}/upload-agent-audio`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur upload");
      return;
    }
    const data = await res.json();
    setFirstMessageAudioUrl(data.url || "");
    setSuccess("Fichier audio enregistré.");
    e.target.value = "";
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{success}</div>
      )}
      {setupResult && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{setupResult}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Numéro du télépro</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33612345678"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">Où appeler le télépro quand un lead NRP décroche.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ID numéro Twilio (Vapi)</label>
        <input
          type="text"
          value={vapiPhoneNumberId}
          onChange={(e) => setVapiPhoneNumberId(e.target.value)}
          placeholder="phn_xxx (à récupérer dans Vapi après avoir ajouté le numéro)"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message d&apos;attente (texte)</label>
        <textarea
          value={vapiHoldMessage}
          onChange={(e) => setVapiHoldMessage(e.target.value)}
          rows={3}
          placeholder="Un instant, nous vous mettons en relation avec un conseiller..."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">Dit au lead pendant que le télépro décroche. Ignoré si un fichier audio est fourni.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Voix de l&apos;agent (français)</label>
        <select
          value={vapiVoiceId}
          onChange={(e) => setVapiVoiceId(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {voiceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Ou : fichier audio (à la place de la voix)</label>
        <input
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700"
        />
        {firstMessageAudioUrl && (
          <p className="text-xs text-slate-500 mt-1 truncate">Fichier actuel : {firstMessageAudioUrl}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">Si fourni, ce fichier sera joué au lieu du message texte + voix. Max 5 Mo, MP3/WAV/M4A.</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={handleSetupAssistant}
          disabled={setupLoading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {setupLoading ? "Configuration…" : "Configurer l'assistant Vapi"}
        </button>
      </div>
    </form>
  );
}
