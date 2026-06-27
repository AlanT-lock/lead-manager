"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeleproAgentConfigFormProps {
  teleproId: string;
  teleproName: string;
  initial: {
    phone: string;
    twilio_phone_number: string;
    welcome_message: string;
    twilio_say_voice: string;
  };
}

export function TeleproAgentConfigForm({
  teleproId,
  initial,
}: TeleproAgentConfigFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial.phone);
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState(initial.twilio_phone_number);
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcome_message);
  const [twilioSayVoice, setTwilioSayVoice] = useState(initial.twilio_say_voice ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        phone: phone?.trim() || null,
        twilio_phone_number: twilioPhoneNumber?.trim() || null,
        vapi_hold_message: welcomeMessage?.trim() || null,
        twilio_say_voice: twilioSayVoice?.trim() || null,
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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{success}</div>
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
        <p className="text-xs text-slate-500 mt-1">Où appeler le télépro quand un lead décroche (transfert NRP et appels entrants).</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Numéro Twilio du télépro</label>
        <input
          type="tel"
          value={twilioPhoneNumber}
          onChange={(e) => setTwilioPhoneNumber(e.target.value)}
          placeholder="+33612345678"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">Numéro Twilio E.164 utilisé pour appeler les leads et recevoir les appels entrants. Obligatoire pour le NRP.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Voix des messages Twilio</label>
        <select
          value={twilioSayVoice}
          onChange={(e) => setTwilioSayVoice(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Défaut (secret TWILIO_SAY_VOICE ou Remi-Neural)</option>
          <optgroup label="Voix naturelles (Neural / Generative)">
            <option value="Polly.Remi-Neural">Polly.Remi-Neural (homme, recommandé)</option>
            <option value="Polly.Lea-Neural">Polly.Lea-Neural (femme, recommandé)</option>
            <option value="Polly.Lea-Generative">Polly.Lea-Generative (femme, très naturelle)</option>
            <option value="Polly.Remi-Generative">Polly.Remi-Generative (homme, très naturelle)</option>
          </optgroup>
          <optgroup label="Voix standard (plus robotiques)">
            <option value="Polly.Mathieu">Polly.Mathieu (homme)</option>
            <option value="Polly.Celine">Polly.Celine (femme)</option>
          </optgroup>
        </select>
        <p className="text-xs text-slate-500 mt-1">Préférer Neural ou Generative pour un rendu plus naturel. Voix utilisée pour le message d&apos;attente NRP et les appels entrants.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message d&apos;accueil (lorsque le lead répond)</label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={3}
          placeholder="Un instant, nous vous mettons en relation avec un conseiller."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1">Message lu au lead dès qu&apos;il décroche, puis en boucle jusqu&apos;à ce que le télépro réponde.</p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
