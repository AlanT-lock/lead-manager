// Edge Function : lancer 2 appels NRP via Twilio (AMD = humain vs messagerie)
// Remplace l’ancien flux Vapi.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/**
 * Normalise un numéro lead vers E.164 pour Twilio.
 * Gère : +3364664..., p:+33663397057, 064664..., 33..., 9 chiffres.
 */
function normalizeLeadPhone(phone: string): string {
  let s = (phone ?? "").trim();
  if (!s) return s;
  if (s.toLowerCase().startsWith("p:")) s = s.slice(2).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return s;
  if (s.startsWith("+33") && digits.length >= 11) return "+33" + digits.slice(-9);
  if (s.startsWith("+") && digits.length >= 10) return s;
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  if (digits.length === 10 && digits[0] === "0") return "+33" + digits.slice(1);
  if (digits.length === 9) return "+33" + digits;
  if (digits.length >= 9) return "+33" + digits.slice(-9);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return jsonResponse({ error: "Non authentifié" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return jsonResponse({ error: "Token invalide" }, 401);

  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile } = await admin
    .from("profiles")
    .select("role, phone, twilio_phone_number")
    .eq("id", user.id)
    .single();

  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "telepro") return jsonResponse({ error: "Réservé aux télépros" }, 403);
  if (!profile?.phone) return jsonResponse({ error: "Numéro télépro non renseigné." }, 400);
  if (!profile?.twilio_phone_number?.trim()) {
    return jsonResponse({ error: "Numéro Twilio non configuré pour votre compte. Renseignez profiles.twilio_phone_number (E.164) dans votre profil." }, 400);
  }

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const webhookBase = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") ?? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/twilio-nrp-webhook`;

  if (!accountSid || !authToken) {
    return jsonResponse({ error: "Configuration Twilio manquante (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)." }, 500);
  }

  const fromNumber = normalizeLeadPhone(profile.twilio_phone_number.trim());

  const { data: nrpLeads } = await admin
    .from("leads")
    .select("id, phone")
    .eq("assigned_to", user.id)
    .eq("status", "nrp")
    .order("last_nrp_ai_call_at", { ascending: true, nullsFirst: true })
    .order("nrp_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(2);

  if (!nrpLeads?.length) {
    return jsonResponse({ error: "Aucun lead NRP à appeler pour le moment." }, 400);
  }

  const batchId = crypto.randomUUID();
  const holdUrl = `${webhookBase}?action=hold`;
  const statusUrl = `${webhookBase}?action=status`;
  const auth = btoa(`${accountSid}:${authToken}`);

  // AMD asynchrone : Twilio appelle l'Url (hold) dès que le lead décroche → le lead entend la voix.
  // Quand l'AMD est terminée, Twilio appelle AsyncAmdStatusCallback avec AnsweredBy → on fait le transfert ou raccrochage.
  const inserted: { call_id: string; lead_id: string }[] = [];

  for (const lead of nrpLeads) {
    const to = normalizeLeadPhone(lead.phone);
    const params = new URLSearchParams({
      To: to,
      From: fromNumber,
      Url: holdUrl,
      Method: "POST",
      StatusCallback: statusUrl,
      StatusCallbackMethod: "POST",
      MachineDetection: "Enable",
      MachineDetectionTimeout: "30",
      Timeout: "60",
      AsyncAmd: "true",
      AsyncAmdStatusCallback: statusUrl,
      AsyncAmdStatusCallbackMethod: "POST",
    });
    params.append("StatusCallbackEvent", "answered");
    params.append("StatusCallbackEvent", "completed");
    const res = await fetch(`${"https://api.twilio.com/2010-04-01"}/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("[nrp-calls-start] Twilio error:", err);
      continue;
    }
    const data = await res.json() as { sid?: string };
    const callSid = data.sid;
    if (!callSid) continue;

    await admin.from("nrp_call_batches").insert({
      batch_id: batchId,
      telepro_id: user.id,
      call_id: callSid,
      lead_id: lead.id,
    });
    await admin.from("lead_logs").insert({
      lead_id: lead.id,
      user_id: user.id,
      action: "NRP Twilio - Appel lancé",
      old_status: "nrp",
      new_status: "nrp",
    });
    await admin.from("leads").update({ last_nrp_ai_call_at: new Date().toISOString() }).eq("id", lead.id);
    inserted.push({ call_id: callSid, lead_id: lead.id });
  }

  if (inserted.length === 0) {
    return jsonResponse({ error: "Impossible de lancer les appels Twilio." }, 502);
  }

  await admin.from("telepro_pending_lead_opens").delete().eq("telepro_id", user.id);
  await admin.from("nrp_pending_transfers").delete().eq("telepro_id", user.id);

  return jsonResponse({
    ok: true,
    callsStarted: inserted.length,
    message: `${inserted.length} appel(s) NRP lancé(s). Dès qu'un lead (humain) décroche, vous serez appelé.`,
  }, 200);
});
