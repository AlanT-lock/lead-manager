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

const INPUT_CLS =
  "w-full h-9 px-3 border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] transition-colors";
const LABEL_CLS = "block text-sm font-medium text-[#0b1f3a] mb-1.5";
const HINT_CLS = "text-xs text-[#64748b] mt-1";

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
    <form
      onSubmit={handleSubmit}
      className="rounded-[12px] border border-[#e1e8f2] bg-white shadow-[0_1px_2px_rgba(13,38,76,.06)] p-6 space-y-5"
    >
      {error && (
        <div className="p-3 rounded-[9px] bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      <div>
        <label className={LABEL_CLS}>Numéro du télépro</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33612345678"
          className={INPUT_CLS}
        />
        <p className={HINT_CLS}>
          Où appeler le télépro quand un lead décroche (transfert NRP et appels entrants).
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>Numéro Twilio du télépro</label>
        <input
          type="tel"
          value={twilioPhoneNumber}
          onChange={(e) => setTwilioPhoneNumber(e.target.value)}
          placeholder="+33612345678"
          className={INPUT_CLS}
        />
        <p className={HINT_CLS}>
          Numéro Twilio E.164 utilisé pour appeler les leads et recevoir les appels entrants. Obligatoire pour le NRP.
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>Voix des messages Twilio</label>
        <select
          value={twilioSayVoice}
          onChange={(e) => setTwilioSayVoice(e.target.value)}
          className={INPUT_CLS}
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
        <p className={HINT_CLS}>
          Préférer Neural ou Generative pour un rendu plus naturel. Voix utilisée pour le message d&apos;attente NRP et les appels entrants.
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>Message d&apos;accueil (lorsque le lead répond)</label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          rows={3}
          placeholder="Un instant, nous vous mettons en relation avec un conseiller."
          className="w-full px-3 py-2 border border-[#e1e8f2] rounded-[9px] bg-white text-[#0b1f3a] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb] transition-colors resize-none"
        />
        <p className={HINT_CLS}>
          Message lu au lead dès qu&apos;il décroche, puis en boucle jusqu&apos;à ce que le télépro réponde.
        </p>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 bg-[#2563eb] text-white text-sm font-medium rounded-[9px] hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
